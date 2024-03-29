import { Component, OnDestroy, OnInit } from '@angular/core';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import {
  AlertController,
  LoadingController,
  ModalController,
  NavController,
  Platform,
  ToastController,
} from '@ionic/angular';
import { ImageService } from 'src/app/core/services/image.service';
import { Image } from '../../core/interface/image.interface';
import { Auth } from '@angular/fire/auth';
import { DocumentSnapshot } from '@angular/fire/firestore';
import { OnlineStatusService, OnlineStatusType } from 'ngx-online-status';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import {
  ActionPerformed,
  PushNotificationSchema,
  PushNotifications,
  Token,
} from '@capacitor/push-notifications';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  public welcomeMessage = '';
  presentingElement = undefined;
  imageFile: File | null = null;
  postText = '';
  imageSrc: string | ArrayBuffer | null = null;
  images: Image[] = [];
  lastDocument: DocumentSnapshot | undefined;
  loading: HTMLIonLoadingElement;
  errorOccurred = false;
  errorMessage = '';
  onlineStatusSubscription: Subscription;
  private modalInstance: HTMLIonModalElement;

  constructor(
    private auth: Auth,
    private platform: Platform,
    private imageService: ImageService,
    private navCtrl: NavController,
    private androidPermissions: AndroidPermissions,
    private modalController: ModalController,
    private loadingCtrl: LoadingController,
    public toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private onlineStatusService: OnlineStatusService
  ) {}

  async ngOnInit(): Promise<void> {
    this.setWelcomeMessage();
    this.checkOnlineStatus();
    this.presentingElement = document.querySelector('.ion-page');
    this.fetchImagePosts();
    this.notificationStatus();
  }

  async notificationStatus() {
    const permissionResult = await this.androidPermissions.checkPermission(
      this.androidPermissions.PERMISSION.POST_NOTIFICATIONS
    );

    if (!permissionResult.hasPermission) {
      const hasPermission = await this.androidPermissions.requestPermission(
        this.androidPermissions.PERMISSION.POST_NOTIFICATIONS
      );

      if (!hasPermission.hasPermission) {
        return;
      }
    }

    PushNotifications.requestPermissions().then(async (result) => {
      if (result.receive === 'granted') {
        PushNotifications.register();
      } else {
        const confirm = await this.alertCtrl.create({
          header: 'Stay in the Loop!',
          message:
            'Unlock the magic of timely updates and stay connected. Allow notifications to receive the latest happenings!',
          buttons: [
            {
              text: 'Ok',
              role: 'cancel',
              handler: async () => {
                this.openAppSettings();
              },
            },
          ],
        });
        await confirm.present();
      }
    });

    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', (token: Token) => {});

    // Some issue with our setup and push will not work
    PushNotifications.addListener('registrationError', (error: any) => {});

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {}
    );

    // Method called when tapping on a notification
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification: ActionPerformed) => {}
    );
  }

  ngOnDestroy() {
    this.onlineStatusSubscription.unsubscribe();
  }

  async openAppSettings() {
    if (this.platform.is('android')) {
      const packageName = 'com.silkwebhq.devvscapecode';
      const intentUri = 'package:' + packageName;
      window.open('intent:' + intentUri + '#Intent;end;');
    }
  }

  async fetchImagePosts(): Promise<void> {
    try {
      this.images = await this.imageService.getImagePosts();
      this.errorOccurred = false;
    } catch (error) {
      this.handleError(error, 'Something went wrong, try again later');
    }
  }

  refresh(ev: any) {
    this.fetchImagePosts();
    setTimeout(() => {
      ev.detail.complete();
    }, 3000);
  }

  setWelcomeMessage(): void {
    const currentDate = new Date();
    const currentHour = currentDate.getHours();

    if (currentHour >= 5 && currentHour < 12) {
      this.welcomeMessage = 'Good morning';
    } else if (currentHour >= 12 && currentHour < 18) {
      this.welcomeMessage = 'Good afternoon';
    } else {
      this.welcomeMessage = 'Good evening';
    }
  }

  trackImage(index: number, image: any): any {
    return image.id;
  }

  // async onIonInfinite(event: CustomEvent) {
  //   this.currentPage++;
  
  //   await this.fetchImagesPage(this.currentPage);
  
  //   event.target.complete();
  
  //   if (!this.hasMoreData) {
  //     event.target.disabled = true;
  //   }
  // }
  

  openImage(selectedImage: any): void {
    //console.log(selectedImage);
    // Open the selected image in the ImageDetailComponent or navigate to a new route
    // You can use a router or any other method to display the ImageDetailComponent
    // Pass the selectedImage data to the ImageDetailComponent
  }

  async openModal() {
    const permissionResult = await this.androidPermissions.checkPermission(
      this.androidPermissions.PERMISSION.READ_EXTERNAL_STORAGE
    );

    if (!permissionResult.hasPermission) {
      const hasPermission = await this.androidPermissions.requestPermission(
        this.androidPermissions.PERMISSION.READ_EXTERNAL_STORAGE
      );

      if (!hasPermission.hasPermission) {
        const confirm = await this.alertCtrl.create({
          header: 'Permission Denied',
          message: 'Storage permission is required to upload images.',
          buttons: [
            {
              text: 'OK',
              role: 'cancel',
              handler: async () => {
                if (this.modalInstance) {
                  await this.modalInstance.dismiss();
                }
              },
            },
          ],
        });
        await confirm.present();
        return;
      }
    }

    const modalElement = document.getElementById('open-modal');
    this.modalInstance = await this.modalCtrl.create({
      component: modalElement,
    });
    await this.modalInstance.present();
  }

  openProfile() {
    this.navCtrl.navigateForward('/profile');
  }

  openNotification() {
    this.navCtrl.navigateForward('/notifications');
  }

  async uploadImageAndPostText() {
    const user = this.auth.currentUser;

    if (this.imageFile) {
      this.showLoading();

      try {
        await this.imageService.uploadImageAndPostText(
          this.imageFile,
          this.postText.replace(/\n/g, '\\n'),
          user.uid,
          user.displayName
        );

        this.hideLoading();

        this.modalController.dismiss();

        const toast = await this.toastCtrl.create({
          message: 'Your post has been committed to the app repository!',
          duration: 5000,
          position: 'bottom',
          color: 'success',
        });
        await toast.present();

        this.imageFile = null;
        this.postText = '';
        this.imageSrc = null;

        this.fetchImagePosts();
      } catch (error) {
        //console.error('Error uploading image and post:', error);

        this.hideLoading();

        const errorToast = await this.toastCtrl.create({
          message:
            'An error occurred while uploading your post. Please try again.',
          duration: 5000,
          position: 'bottom',
          color: 'danger',
        });
        await errorToast.present();
      }
    }
  }

  onFileSelected(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement.files && inputElement.files.length) {
      this.imageFile = inputElement.files[0];
      this.displaySelectedImage();
    }
  }

  displaySelectedImage() {
    const reader = new FileReader();
    reader.onload = (event) => {
      this.imageSrc = event.target?.result;
    };
    reader.readAsDataURL(this.imageFile);
  }

  cancelImageSelection() {
    this.imageFile = null;
    this.imageSrc = null;
  }

  async showLoading(): Promise<void> {
    try {
      this.loading = await this.loadingCtrl.create({
        message: 'Uploading...',
        cssClass: 'custom-loading',
      });
      await this.loading.present();
    } catch (error) {
      this.handleError(error);
    }
  }

  async hideLoading(): Promise<boolean> {
    if (this.loading) {
      return this.loading.dismiss();
    }
    return false;
  }

  async handleError(error: any, customMessage?: string): Promise<void> {
    const errorMessage = customMessage || error.message || 'An error occurred';
    const toast = await this.toastCtrl.create({
      message: errorMessage,
      duration: 5000,
      position: 'bottom',
      color: 'danger',
    });
    await toast.present();
  }

  checkOnlineStatus() {
    this.onlineStatusSubscription = this.onlineStatusService.status
      .pipe(
        switchMap((status) => {
          if (status === OnlineStatusType.OFFLINE) {
            return this.toastCtrl.create({
              message: 'Looks like you are in the land of offline adventures!',
              duration: 5000,
              position: 'bottom',
              color: 'danger',
              icon: 'alert',
            });
          }
          return null;
        })
      )
      .subscribe(async (toast) => {
        if (toast) {
          await toast.present();
          setTimeout(async () => {
            await toast.dismiss();
          }, 3000);
        }
      });
  }
}
