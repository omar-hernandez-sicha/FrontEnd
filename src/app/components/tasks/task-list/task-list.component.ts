import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MenubarModule } from 'primeng/menubar';
import { PaginatorModule } from 'primeng/paginator';
import { RippleModule } from 'primeng/ripple';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { Subject } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import { CreateTaskRequest, Task } from '../../../core/models/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { TaskService } from '../../../core/services/task.service';
import { TaskListCardComponent } from './task-list-card/task-list-card.component';
import { TaskListItemAddComponent } from './task-list-item-add/task-list-item-add.component';
import { DeviceDetectorService } from 'ngx-device-detector';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [MatSnackBarModule, MatDialogModule, CommonModule, MatIconModule, MatCardModule, ReactiveFormsModule,
    MatFormFieldModule, MatProgressSpinnerModule, MatCheckboxModule, TaskListCardComponent, MenubarModule, BadgeModule,
    RippleModule, PaginatorModule, ButtonModule, ToolbarModule, TooltipModule, ConfirmDialogModule, TaskListItemAddComponent],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.scss',
  providers: [ConfirmationService]
})
export class TaskListComponent implements OnInit, OnDestroy {
  tasks: Task[] = [];

  private destroy$ = new Subject<void>();
  private getAllTask$: Subject<string> = new Subject<string>();
  private taskService: TaskService = inject(TaskService);
  private confirmationService: ConfirmationService = inject(ConfirmationService);
  private authService: AuthService = inject(AuthService);
  private router: Router = inject(Router);
  private snackBar: MatSnackBar = inject(MatSnackBar);
  private deviceService: DeviceDetectorService = inject(DeviceDetectorService);

  isLoading = false;
  isSubmitting = false;
  isPending = true;
  dialogVisible = false;
  currentUser = this.authService.getCurrentUser();
  first: number = 0;
  rows: number = 6;
  totalCount: number = 0;
  items: MenuItem[] = [];
  selectedTask: Task | null = null;

  constructor() {
    /**
     * Configura el flujo reactivo para la carga de tareas
     * Utiliza un Subject para manejar las solicitudes de obtención de tareas
     */
    this.getAllTask$.pipe(
      takeUntil(this.destroy$),
      /**
       * Obtiene las tareas del usuario actual con paginación
       * @param userId - ID del usuario autenticado
       * @param first - Índice del primer elemento a cargar
       * @param rows - Número de filas por página
       */
      switchMap(() => this.taskService.getUserTasks(this.currentUser!.id, this.first.toString(), this.rows.toString())),
      catchError((error, originalObs) => {
        this.isLoading = false;
        this.snackBar.open(
          'Error de conexión. Intenta nuevamente.',
          'Cerrar',
          { duration: 5000 }
        );

        return originalObs;
      })
    ).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data) {
          this.isPending = true;

          if (this.esDispositivoMovil) {
            if (response.data.tasks.length === 0) {
              this.first = -1;

              return;
            }

            this.first += this.rows;
            this.tasks = [...this.tasks, ...response.data.tasks];
            this.totalCount = this.totalCount + response.data.count;
          } else {
            this.tasks = response.data.tasks;
            this.totalCount = response.data.count;
          }

          /**
           * Configura los items del menú de filtrado (Pendientes/Completadas)
           * Incluye badges con el conteo actual de tareas en cada categoría
           */
          this.items = [
            {
              label: 'Pendientes',
              icon: 'pi pi-calendar-clock',
              styleClass: 'my-highlight-class',
              badge: this.pendingTasksCount.toString(),
              command: () => {
                this.isPending = true;
                this.items[0].styleClass = 'my-highlight-class';
                this.items[1].styleClass = '';
              }
            },
            {
              label: 'Completadas',
              icon: 'pi pi-calendar',
              badge: this.completedTasksCount.toString(),
              command: () => {
                this.isPending = false;
                this.items[0].styleClass = '';
                this.items[1].styleClass = 'my-highlight-class';
              }
            }
          ]
        } else {
          this.snackBar.open(
            response.error || 'Error al cargar las tareas',
            'Cerrar',
            { duration: 5000 }
          );
        }
      }
    });
  }

  /**
   * Verifica la autenticación del usuario y carga las tareas
   */
  ngOnInit(): void {
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    // Carga las tareas con un pequeño delay para asegurar la renderización
    setTimeout(() => this.loadTasks(), 50);
  }

  /**
   * Limpia las suscripciones para prevenir memory leaks
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicia el proceso de carga de tareas
   * Activa el estado de carga y dispara el Subject de obtención de tareas
   */
  loadTasks(): void {
    this.isLoading = true;
    this.getAllTask$.next('');
  }

  /**
   * Maneja el envío del formulario de tarea (creación o edición)
   * @param taskForm - FormGroup con los datos de la tarea
   */
  onSubmit(taskForm: FormGroup): void {
    if (taskForm.valid && this.currentUser) {
      this.isSubmitting = true;

      if (this.selectedTask) {
        this.selectedTask.title = taskForm.get('title')?.value.trim();
        this.selectedTask.description = taskForm.get('description')?.value.trim() || '';
        this.updateTask(this.selectedTask);
      } else
        this.createTask(taskForm);
    }
  }

  /**
   * Maneja el cambio de página en la paginación
   * @param event - Evento de cambio de página con información de paginación
   */
  onPageChange(event: any) {
    this.first = event.first;
    this.loadTasks();
  }

  /**
   * Alterna el estado de completado/pendiente de una tarea
   * @param task - Tarea a modificar
   */
  toggleTaskCompletion(task: Task): void {
    const updatedTask = { ...task, completed: !task.completed };
    this.updateTask(updatedTask);
  }

  /**
   * Muestra el diálogo para crear una nueva tarea
   * Reinicia la tarea seleccionada para modo creación
   */
  showDialogEdit() {
    this.selectedTask = null;
    this.dialogVisible = true;
  }

  /**
   * Muestra el diálogo para editar una tarea existente
   * @param event - Tarea seleccionada para edición
   */
  clickOnEdit(event: Task) {
    this.selectedTask = event;
    this.dialogVisible = true;
  }

  /**
   * Crea una nueva tarea en el sistema
   * @param taskForm - FormGroup con los datos de la nueva tarea
   */
  createTask(taskForm: FormGroup) {
    const taskData: CreateTaskRequest = {
      title: taskForm.get('title')?.value.trim(),
      description: taskForm.get('description')?.value.trim() || '',
      userId: this.currentUser!.id
    };

    const validation = this.taskService.validateTaskData(taskData);
    if (!validation.isValid) {
      this.snackBar.open(validation.errors[0], 'Cerrar', { duration: 5000 });
      this.isSubmitting = false;
      return;
    }

    this.taskService.createTask(taskData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          if (response.success && response.data) {
            this.resetValues();
            this.loadTasks();
            taskForm.reset();

            this.dialogVisible = false;
            this.snackBar.open('Tarea creada exitosamente', 'Cerrar', { duration: 3000 });
          } else {
            this.snackBar.open(
              response.error || 'Error al crear la tarea',
              'Cerrar',
              { duration: 5000 }
            );
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          this.snackBar.open(
            'Error de conexión. Intenta nuevamente.',
            'Cerrar',
            { duration: 5000 }
          );
          console.error('Error creating task:', error);
        }
      });
  }

  /**
   * Actualiza una tarea existente en el sistema
   * @param task - Tarea con los datos actualizados
   */
  updateTask(task: Task): void {
    const updateData = {
      title: task.title,
      description: task.description,
      completed: task.completed
    };

    this.taskService.updateTask(task.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            const index = this.tasks.findIndex(t => t.id === task.id);
            if (index !== -1) {
              this.tasks[index] = response.data!.task;

              if (this.isSubmitting) {
                this.isSubmitting = false;
                this.snackBar.open('Tarea actualizada exitosamente', 'Cerrar', { duration: 3000 });
                this.dialogVisible = false;
              } else {
                this.items[0].badge = this.pendingTasksCount.toString();
                this.items[1].badge = this.completedTasksCount.toString();
              }
            }
          } else {
            this.isSubmitting = false;
            this.snackBar.open(
              response.error || 'Error al actualizar la tarea',
              'Cerrar',
              { duration: 5000 }
            );

            this.loadTasks();
          }
        },
        error: (error) => {
          this.isSubmitting = false;
          this.snackBar.open(
            'Error de conexión. Intenta nuevamente.',
            'Cerrar',
            { duration: 5000 }
          );
          this.loadTasks();
        }
      });
  }

  /**
   * Maneja la solicitud de eliminación de una tarea
   * Muestra un diálogo de confirmación antes de proceder
   * @param event - Evento que contiene la tarea a eliminar
   */
  deleteTaskHandler(event: any) {
    this.confirmationService.confirm({
      target: event!.button,
      message: '¿Está seguro que desea eliminar la tarea?',
      icon: 'pi pi-exclamation-triangle',
      rejectLabel: 'Cancelar',
      rejectIcon: 'pi pi-times',
      acceptLabel: 'Borrar',
      acceptIcon: 'pi pi-trash',
      accept: () => {
        this.taskService.deleteTask(event!.tasks!.id, this.currentUser!.id)
          .subscribe({
            next: (response) => {
              if (response.success) {
                this.resetValues();
                this.loadTasks();
                this.snackBar.open('Tarea eliminada exitosamente', 'Cerrar', { duration: 3000 });
              } else {
                this.snackBar.open(
                  response.error || 'Error al eliminar la tarea',
                  'Cerrar',
                  { duration: 5000 }
                );
              }
            },
            error: (error) => {
              this.snackBar.open(
                'Error de conexión. Intenta nuevamente.',
                'Cerrar',
                { duration: 5000 }
              );
            }
          });
      },
      reject: () => {

      }
    });
  }

  /**
   * Cierra la sesión del usuario y redirige al login
   */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  /**
   * Obtiene el número de tareas pendientes
   * @returns Número de tareas no completadas
   */
  get pendingTasksCount(): number {
    return this.tasks.filter(t => !t.completed).length;
  }

  /**
   * Obtiene el número de tareas completadas
   * @returns Número de tareas completadas
   */
  get completedTasksCount(): number {
    return this.tasks.filter(t => t.completed).length;
  }

  /**
   * Obtiene la lista de tareas completadas
   * @returns Array de tareas completadas
   */
  get completedTasks(): Task[] {
    return this.tasks.filter(t => t.completed);
  }

  /**
   * Obtiene la lista de tareas pendientes
   * @returns Array de tareas no completadas
   */
  get pendingTasks(): Task[] {
    return this.tasks.filter(t => !t.completed);
  }

  get esDispositivoMovil() {
    return this.deviceService.isMobile();
  }

  onScroll(event: any) {
    if (this.esDispositivoMovil) {
      if (this.first === -1)
        return;

      if (this.isLoading)
        return;

      if (!this.atBottom(event))
        return;

      this.loadTasks();
    }
  }

  private resetValues() {
    if (this.esDispositivoMovil) {
      this.first = 0;
      this.tasks = [];
      this.totalCount = 0;
    }
  }

  private atBottom(event: any) {
    const tracker = event.target;
    const limit = tracker.scrollHeight - tracker.clientHeight;

    return event.target.scrollTop === limit;
  }

  /**
   * Función de trackBy para optimizar el rendering de la lista de tareas
   * @param index - Índice del elemento en el array
   * @param task - Tarea actual
   * @returns Identificador único de la tarea
   */
  trackByTaskId(index: number, task: Task): string {
    return task.id;
  }
}
