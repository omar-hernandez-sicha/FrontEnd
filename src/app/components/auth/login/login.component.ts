import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { catchError, combineLatest, EMPTY, Observable, Observer, of, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MatSnackBarModule, MatButtonModule, MatCardModule, MatInputModule, MatFormFieldModule, CommonModule,
    ReactiveFormsModule, MatProgressSpinnerModule, MatIconModule, ConfirmDialogModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  providers: [ConfirmationService]
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  isLoading = false;
  isCheckingUser = false;

  private router = inject(Router);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);
  private confirmationService: ConfirmationService = inject(ConfirmationService);
  private validateUser$: Subject<string> = new Subject<string>();

  constructor() {
    /**
    * Inicializa el formulario de login con validación de email requerido y formato válido
    */
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    /**
    * Configura el flujo reactivo para la validación de usuarios
    * Utiliza un Subject para manejar las solicitudes de validación de forma eficiente
    */
    this.validateUser$.pipe(
      takeUntil(this.destroy$),
      tap((email: string) => {
        this.isLoading = true;
        this.isCheckingUser = true;
      }),
      /**
      * Verifica si el usuario existe en el sistema
      * Combina la respuesta del servicio con el email original para mantener el contexto
      */
      switchMap((email: string) => combineLatest([this.authService.checkUserExists(email), of(email)])),
      /**
       * Procesa la respuesta de existencia del usuario
       * - Si hay error de conexión, muestra notificación
       * - Si el usuario no existe, solicita confirmación para creación automática
       * - Si el usuario existe, continúa con el flujo normal
       */
      switchMap(([value, email]) => {
        if (!value.success) {
          this.snackBar.open(
            'Error de conexión. Intenta nuevamente.',
            'Cerrar',
            { duration: 5000 }
          );

          return combineLatest([of(false), of(email)]);
        }

        if (!value.data?.exists) {
          this.isCheckingUser = false;
          return combineLatest([this.confirmAction('Favor confirmar para proceder.',
            '¿Desea crear su usuario automáticamente?'), of(email)])
        }

        return combineLatest([of(true), of(email)]);
      }
      ),
      /**
      * Ejecuta el login o cancela la operación según la respuesta del usuario
      * - Si la respuesta es positiva, procede con el login/registro
      * - Si es negativa, detiene el flujo y desactiva los estados de carga
      */
      switchMap(([response, email]) => {
        if (response)
          return this.authService.login(email);

        this.isLoading = false;
        return EMPTY;
      }),
      catchError((error, originalObs) => {
        this.isLoading = false;
        this.isCheckingUser = false;
        this.snackBar.open(
          'Error de conexión. Intenta nuevamente.',
          'Cerrar',
          { duration: 5000 }
        );

        return originalObs;
      })
    ).subscribe({
      /**
      * Maneja la respuesta exitosa del proceso de login/registro
      * - Muestra mensaje de bienvenida según si el usuario existía o fue creado
      * - Redirige a la página de tareas si fue exitoso
      * - Muestra error si la operación falló
      */
      next: (response) => {
        this.isLoading = false;

        if (response.success) {
          this.snackBar.open(
            response.data?.user.exists ?
              '¡Bienvenido de nuevo!' :
              '¡Usuario creado exitosamente!',
            'Cerrar',
            { duration: 3000 }
          );
          this.router.navigate(['/tasks']);
        } else {
          this.snackBar.open(
            response.error || 'Error en el login',
            'Cerrar',
            { duration: 5000 }
          );
        }
      }
    });
  }

  /**
   * Verifica si el usuario ya está autenticado y lo redirige a la página principal
   */
  ngOnInit(): void {
    if (this.authService.isAuthenticated())
      this.router.navigate(['/tasks']);
  }

  /**
  * Maneja el evento de envío del formulario de login
  * Valida el formulario y dispara el proceso de validación del usuario
  */
  onSubmit(): void {
    if (this.loginForm.valid) {
      const email = this.email?.value;
      this.validateUser$.next(email);
    }
  }

  /**
   * Muestra un diálogo de confirmación al usuario
   * @param message - Mensaje a mostrar en el diálogo
   * @param header - Título del diálogo
   * @returns Observable que emite un booleano con la respuesta del usuario
   */
  confirmAction(message: string, header: string): Observable<boolean> {
    return new Observable((observer: Observer<boolean>) => {
      this.confirmationService.confirm({
        header: header,
        message: message,
        accept: () => {
          observer.next(true);
          observer.complete();
        },
        reject: () => {
          observer.next(false);
          observer.complete();
        }
      });
    });
  }

  /**
   * Getter para acceder al control de email del formulario
   * @returns AbstractControl del campo email o null si no existe
   */
  get email() {
    return this.loginForm.get('email');
  }

  /**
   * Limpia las suscripciones para prevenir memory leaks
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
