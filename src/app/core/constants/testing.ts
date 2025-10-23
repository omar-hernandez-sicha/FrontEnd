export const TESTING = {
  api: {
    baseUrl: '/api',
    tasks: {
      listByUser: (userId: string, first: string, row: string) => `/tasks/user/${userId}/${first}/${row}`,
      get: (taskId: string) => `/tasks/task/${taskId}`,
      create: '/tasks',
      update: (taskId: string) => `/tasks/${taskId}`,
      delete: (taskId: string) => `/tasks/${taskId}`
    },
    users: {
      check: (email: string) => `/users/check/${encodeURIComponent(email)}`,
      findOrCreate: '/users/find-or-create'
    }
  }
} as const;
