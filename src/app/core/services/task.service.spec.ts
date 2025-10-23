import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';
import { TaskService } from './task.service';
import { ApiResponse, CreateTaskRequest, TaskResponse, TasksResponse } from '../models/api.models';
import { TESTING } from '../constants/testing';

describe('TaskService', () => {
  let service: TaskService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService, TaskService]
    });

    service = TestBed.inject(TaskService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería obtener tareas por usuario', () => {
    const userId = 'u1';
    const mockResponse: ApiResponse<TasksResponse> = {
      success: true,
      data: { tasks: [], count: 0 }
    };

    service.getUserTasks(userId, '0', '10').subscribe((resp) => {
      expect(resp.success).toBeTrue();
      expect(resp.data?.tasks.length).toBe(0);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}${TESTING.api.tasks.listByUser(userId, '0', '10')}`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('debería crear una tarea', () => {
    const payload: CreateTaskRequest = { title: 'A', description: '', userId: 'u1' };
    const mockResponse: ApiResponse<TaskResponse> = {
      success: true,
      data: { task: { id: 't1', title: 'A', description: '', userId: 'u1', completed: false, createdAt: new Date().toISOString() }, message: 'ok' }
    };

    service.createTask(payload).subscribe((resp) => {
      expect(resp.success).toBeTrue();
      expect(resp.data?.task.id).toBe('t1');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}${TESTING.api.tasks.create}`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });
});
