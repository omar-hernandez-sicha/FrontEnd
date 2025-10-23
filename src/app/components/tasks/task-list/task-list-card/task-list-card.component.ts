import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { Task } from '../../../../core/models/api.models';
import { TaskListItemComponent } from '../task-list-item/task-list-item.component';

@Component({
  selector: 'app-task-list-card',
  standalone: true,
  imports: [CommonModule, ConfirmPopupModule, TaskListItemComponent, MatCardModule],
  templateUrl: './task-list-card.component.html',
  styleUrl: './task-list-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Componente de presentación para mostrar una lista de tareas en formato tarjeta
 * Se encarga de la visualización y delegación de eventos
 */
export class TaskListCardComponent {
  @Input() tasks: Task[] = [];
  @Output() deleteTask = new EventEmitter<{ tasks: Task | undefined, button: EventTarget | null }>();
  @Output() toggleTaskCompletion = new EventEmitter<Task>();
  @Output() editTask = new EventEmitter<Task>();

  /**
 * Maneja la solicitud de eliminación de una tarea
 * Propaga el evento al componente padre para su procesamiento
 * @param event - Objeto que contiene la tarea a eliminar y el botón que disparó el evento
 * @param event.tasks - Tarea seleccionada para eliminar
 * @param event.button - Elemento HTML que disparó el evento (para posicionamiento de diálogos)
 */
  deleteItemTask(event: { tasks: Task | undefined, button: EventTarget | null }) {
    this.deleteTask.emit(event);
  }

  /**
 * Maneja la solicitud de edición de una tarea
 * Propaga el evento al componente padre para su procesamiento
 * @param event - Tarea seleccionada para edición
 */
  clickOnEdit(event: Task) {
    this.editTask.emit(event);
  }

  /**
  * Maneja el cambio de estado de completado de una tarea
  * Propaga el evento al componente padre para su procesamiento
  * @param event - Tarea cuyo estado de completado debe ser alternado
  */
  toggleTask(event: Task): void {
    this.toggleTaskCompletion.emit(event);
  }

  /**
 * Función de trackBy para optimizar el rendimiento de ngFor
 * @param index - Índice actual en el iterable
 * @param task - Objeto tarea actual
 * @returns Identificador único de la tarea (su ID)
 */
  trackByTaskId(index: number, task: Task): string {
    return task.id;
  }
}
