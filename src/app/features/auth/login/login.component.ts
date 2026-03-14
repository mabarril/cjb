import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UppercaseDirective } from '../../../core/directives/uppercase.directive';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ReactiveFormsModule, CommonModule, UppercaseDirective],
    templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

    isLoginMode = signal(true);
    isForgotPasswordMode = signal(false);
    isRecoveryMode = signal(false);
    isLoading = signal(false);
    errorMessage = signal('');

    loginForm: FormGroup = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]]
    });

    forgotPasswordForm: FormGroup = this.fb.group({
        email: ['', [Validators.required, Validators.email]]
    });

    recoveryForm: FormGroup = this.fb.group({
        password: ['', [Validators.required, Validators.minLength(6)]]
    });

    registerForm: FormGroup = this.fb.group({
        full_name: ['', Validators.required],
        username: ['', Validators.required],
        voice_part: ['Soprano', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]]
    });

    ngOnInit() {
        if (window.location.hash.includes('type=recovery')) {
            this.isRecoveryMode.set(true);
            this.isLoginMode.set(false);
            this.isForgotPasswordMode.set(false);
        }
    }

    toggleMode() {
        this.isLoginMode.set(!this.isLoginMode());
        this.isForgotPasswordMode.set(false);
        this.errorMessage.set('');
    }

    toggleForgotPasswordMode() {
        this.isForgotPasswordMode.set(!this.isForgotPasswordMode());
        this.errorMessage.set('');
    }

    async onSubmit() {
        this.errorMessage.set('');

        if (this.isRecoveryMode()) {
            if (this.recoveryForm.invalid) return;

            this.isLoading.set(true);
            const { password } = this.recoveryForm.value;

            this.authService.updateUserPassword(password).subscribe({
                next: (res) => {
                    this.isLoading.set(false);
                    if (res.error) {
                        this.errorMessage.set(res.error.message);
                    } else {
                        this.errorMessage.set('Senha atualizada com sucesso! Você já pode acessar o sistema.');
                        this.isRecoveryMode.set(false);
                        this.isLoginMode.set(true);
                        this.recoveryForm.reset();
                    }
                },
                error: (err) => {
                    this.isLoading.set(false);
                    this.errorMessage.set('Falha ao atualizar a senha.');
                }
            });
            return;
        }

        if (this.isForgotPasswordMode()) {
            if (this.forgotPasswordForm.invalid) return;

            this.isLoading.set(true);
            const { email } = this.forgotPasswordForm.value;

            this.authService.resetPasswordForEmail(email).subscribe({
                next: (res) => {
                    this.isLoading.set(false);
                    if (res.error) {
                        this.errorMessage.set(res.error.message);
                    } else {
                        this.errorMessage.set('Instruções para redefinir a senha foram enviadas para o seu e-mail.');
                        this.forgotPasswordForm.reset();
                    }
                },
                error: (err) => {
                    this.isLoading.set(false);
                    this.errorMessage.set('Falha ao solicitar a redefinição de senha.');
                }
            });
            return;
        }

        if (this.isLoginMode()) {
            if (this.loginForm.invalid) return;

            this.isLoading.set(true);
            const { email, password } = this.loginForm.value;

            this.authService.signIn(email, password).subscribe({
                next: (res) => {
                    this.isLoading.set(false);
                    if (res.error) {
                        this.errorMessage.set(res.error.message);
                    } else {
                        this.router.navigate(['/dashboard']);
                    }
                },
                error: (err) => {
                    this.isLoading.set(false);
                    this.errorMessage.set('Falha na autenticação. Verifique suas credenciais.');
                }
            });

        } else {
            if (this.registerForm.invalid) return;

            this.isLoading.set(true);
            this.authService.signUp(this.registerForm.value).subscribe({
                next: (res) => {
                    this.isLoading.set(false);
                    this.toggleMode();
                    this.errorMessage.set('Cadastro realizado! Aguarde o administrador aprovar seu perfil.');
                },
                error: (err) => {
                    this.isLoading.set(false);
                    console.error("DEBUG SIGNUP ERROR:", err);
                    this.errorMessage.set('Erro ao realizar o cadastro. Tente novamente.');
                }
            });
        }
    }
}
