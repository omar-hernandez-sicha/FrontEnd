import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { ApiResponse, CreateTaskRequest, Task, TaskResponse, TasksResponse, UpdateTaskRequest } from '../models/api.models';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private apiService: ApiService = inject(ApiService);
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  public tasks$ = this.tasksSubject.asObservable();

  getUserTasks(userId: string, first:string, row: string): Observable<ApiResponse<TasksResponse>> {
    return this.apiService
      .get<ApiResponse<TasksResponse>>(`/tasks/user/${userId}/${first}/${row}`)
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            const normalized = [...response.data.tasks].sort((a, b) =>
              new Date(b.createdAt ?? '').getTime() - new Date(a.createdAt ?? '').getTime()
            );
            this.tasksSubject.next(normalized);
          }
        })
      );
  }

  geTask(taskId: string): Observable<ApiResponse<TasksResponse>> {
    return this.apiService.get<ApiResponse<TasksResponse>>(`/tasks/task/${taskId}`);
  }
  createTask(taskData: CreateTaskRequest): Observable<ApiResponse<TaskResponse>> {
    // Optimista: añadir al estado inmediatamente con id temporal
    const tempId = `temp_${Date.now()}`;
    const tempTask: Task = {
      id: tempId,
      title: taskData.title,
      description: taskData.description,
      userId: taskData.userId,
      completed: false,
      createdAt: new Date().toISOString()
    };

    const current = this.tasksSubject.value;
    this.tasksSubject.next([tempTask, ...current]);

    return this.apiService.post<ApiResponse<TaskResponse>>('/tasks', taskData).pipe(
      tap((response) => {
        if (response.success && response.data) {
          const replaced = this.tasksSubject.value.map(t => t.id === tempId ? response.data!.task : t);
          this.tasksSubject.next(replaced);
        }
      }),
      catchError((err) => {
        // Rollback
        this.tasksSubject.next(current);
        return of(err as unknown as ApiResponse<TaskResponse>);
      })
    );
  }

  updateTask(taskId: string, updateData: UpdateTaskRequest): Observable<ApiResponse<TaskResponse>> {
    const previous = this.tasksSubject.value;
    // Optimista
    const optimistic = previous.map(t => t.id === taskId ? { ...t, ...updateData } as Task : t);
    this.tasksSubject.next(optimistic);

    return this.apiService.put<ApiResponse<TaskResponse>>(`/tasks/${taskId}`, updateData).pipe(
      tap((response) => {
        if (response.success && response.data) {
          const patched = this.tasksSubject.value.map(t => t.id === taskId ? response.data!.task : t);
          this.tasksSubject.next(patched);
        }
      }),
      catchError(() => {
        // Rollback
        this.tasksSubject.next(previous);
        return of({ success: false, error: 'Update failed' } as ApiResponse<TaskResponse>);
      })
    );
  }

  deleteTask(taskId: string, userId: string): Observable<ApiResponse<{ message: string }>> {
    const previous = this.tasksSubject.value;
    // Optimista
    const afterDelete = previous.filter(t => t.id !== taskId);
    this.tasksSubject.next(afterDelete);

    return this.apiService.delete<ApiResponse<{ message: string }>>(`/tasks/${taskId}`).pipe(
      catchError(() => {
        // Rollback
        this.tasksSubject.next(previous);
        return of({ success: false, error: 'Delete failed' } as ApiResponse<{ message: string }>);
      })
    );
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);

    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  validateTaskData(taskData: CreateTaskRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!taskData.title || taskData.title.trim().length === 0) {
      errors.push('El título es requerido');
    }

    if (taskData.title && taskData.title.trim().length > 200) {
      errors.push('El título no puede tener más de 200 caracteres');
    }

    if (taskData.description && taskData.description.length > 1000) {
      errors.push('La descripción no puede tener más de 1000 caracteres');
    }

    if (!taskData.userId) {
      errors.push('ID de usuario es requerido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
