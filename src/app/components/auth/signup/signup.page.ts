import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { PasswordValidators } from 'src/app/core/validators/password-validators';
import { AuthService } from 'src/app/core/services/auth.service';
import { VersionService } from 'src/app/core/services/version.service';
import { WhitespaceValidators } from 'src/app/core/validators/whitespace-validators';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
})
export class SignupPage implements OnInit {

  signupForm: FormGroup;
  signupStatus: any;
  errorMessage: string;
  isSuccessul = false;
  isSignUpFailed = false;
  currentVersion: string;

  constructor(private router: Router, private authService: AuthService, private version: VersionService, private toastCtrl: ToastController, public loadingCtrl: LoadingController) {
    this.signupForm = this.createFormGroup();
  }

  createFormGroup(): FormGroup<any> {
    return new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email, WhitespaceValidators.cannotContainWhitespace]),
      username: new FormControl('', [Validators.required, WhitespaceValidators.cannotContainWhitespace]),
      password: new FormControl('', [Validators.required, Validators.minLength(6)]),
      confirmpassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
      bio: new FormControl('', Validators.required)
    }, PasswordValidators.MatchValidator('password', 'confirmpassword'))
  }

  ngOnInit() {
    this.currentVersion = this.version.getCurrentVersion();
    this.authService.logout();
  }

  async onSignUp(): Promise<void> {
    try {
      const loading = await this.loadingCtrl.create({
        message: 'Creating account...',
        duration: 10000,
        cssClass: 'custom-loading',
      });
      loading.present();

      if (this.email && this.username, this.password, this.bio) {
        this.authService.signup(this.email.value, this.username.value, this.password.value, this.bio.value).subscribe(async (response: any) => {
          if (response.success == true) {
            //console.log(response);
            this.isSuccessul = true;
            const toast = this.toastCtrl.create({
              message: `Hey ${this.username.value}, your account has been created`,
              duration: 10000,
              position: 'bottom',
              color: 'danger',
              icon: 'sad'
            });
            (await toast).present();
            setTimeout(async () => {
              (await toast).dismiss();
            }, 3000);
            //Send email notification
            this.authService.sendEmail(this.email.value, `Hello ${this.username.value} \n\nI'm Collins, the founder and CEO of SilkwebHQ Technologies.\n\nWe're happy to have you join our family, so I wanted to say hello. I would like to express my sincere thanks to you on behalf of the Silk Community, the entire Silk Team and myself.\n\nIn Developers Escape, an app with memes related to the programmer world, code humour is the focus. Those who understand binary will find this place useful. Check it out :).\n\nBecome part of our active developer community and share that meme :) https://www.silkwebhq.com/\n\nRegards, \n\nCollins Boit`, "Welcome to Devvscape | CodeHumor");
            this.router.navigateByUrl('/login');
            loading.dismiss();
          } else {
            this.signupStatus = response;
            this.errorMessage = this.signupStatus.message;
            this.isSignUpFailed = true;
            const toast = this.toastCtrl.create({
              message: this.errorMessage,
              duration: 10000,
              position: 'bottom',
              color: 'danger',
              icon: 'sad'
            });
            (await toast).present();
            setTimeout(async () => {
              (await toast).dismiss();
            }, 3000)
            loading.dismiss();
          }
        }, async (error: Error | HttpErrorResponse) => {
          loading.dismiss();
          this.isSignUpFailed = true;
          const toast = this.toastCtrl.create({
            message: `${error.message}`,
            duration: 10000,
            position: 'bottom',
            color: 'danger',
            icon: 'sad'
          });
          (await toast).present();
          setTimeout(async () => {
            (await toast).dismiss();
          }, 3000)
        })
      }
    } catch (error) {
      const toast = this.toastCtrl.create({
        message: error,
        duration: 10000,
        position: 'bottom',
        color: 'danger',
        icon: 'sad'
      });
      (await toast).present();
      setTimeout(async () => {
        (await toast).dismiss();
      }, 1000);
    }
  }

  //getters
  get email() {
    return this.signupForm.get('email');
  }

  get username() {
    return this.signupForm.get('username');
  }

  get password() {
    return this.signupForm.get('password');
  }

  get confirmpassword() {
    return this.signupForm.get('confirmpassword');
  }

  get bio() {
    return this.signupForm.get('bio');
  }

  get passwordMatchError() {
    return (this.signupForm.getError('mismatch') && this.signupForm.get('confirmpassword')?.touched)
  }

}