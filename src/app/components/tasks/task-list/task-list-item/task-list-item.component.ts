import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CardModule } from 'primeng/card';
import { Task } from '../../../../core/models/api.models';
import { ButtonModule } from 'primeng/button';
import { MatIconModule } from '@angular/material/icon';
import { TaskService } from '../../../../core/services/task.service';

@Component({
  selector: 'app-task-list-item',
  standalone: true,
  imports: [CardModule, CommonModule, MatCheckboxModule, ButtonModule, MatIconModule],
  templateUrl: './task-list-item.component.html',
  styleUrl: './task-list-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskListItemComponent {
  @Input() task: Task | undefined;
  @Output() deleteTask = new EventEmitter<{ tasks: Task | undefined, button: EventTarget | null }>();
  @Output() editTask = new EventEmitter<Task>();
  @Output() toggleTaskCompletion = new EventEmitter<Task>();

  private taskService: TaskService = inject(TaskService);

  /**
 * Maneja el evento de eliminación de una tarea
 * Prepara los datos y emite el evento al componente padre para su procesamiento
 * @param event - Evento DOM original disparado por el botón de eliminar
 * @emits deleteTask - Emite un objeto con la tarea actual y el elemento que disparó el evento
 */
  deleteItemTask(event: Event) {
    this.deleteTask.emit({ tasks: this.task, button: event.target });
  }

  /**
 * Alterna el estado de completado de la tarea actual
 * Emite el evento al componente padre para actualizar el estado en el servidor
 * @emits toggleTaskCompletion - Emite la tarea actual para cambiar su estado
 */
  toggleTask(): void {
    this.toggleTaskCompletion.emit(this.task!);
  }

  /**
 * Formatea una fecha string para su visualización amigable
 * Utiliza el servicio TaskService para aplicar el formato consistente
 */
  formatDate(dateString?: string): string {

    return dateString ? this.taskService.formatDate(dateString) : dateString ?? "";
  }

  /**
 * Inicia el proceso de edición de la tarea actual
 * Emite el evento al componente padre para abrir el diálogo de edición
 * @emits editTask - Emite la tarea actual para su edición
 */
  clickOnEdit() {
    this.editTask.emit(this.task);
  }
}
