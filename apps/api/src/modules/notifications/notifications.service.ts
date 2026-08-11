import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  async getRecentNotifications(userId: string) {
    return [
      {
        id: 'notif-1',
        title: 'Post Published Successfully',
        message: '"10 AI Productivity Hacks" has been published to Twitter and LinkedIn.',
        type: 'success',
        read: false,
        createdAt: new Date(),
      },
      {
        id: 'notif-2',
        title: 'Scheduled Post Reminder',
        message: '"Weekly Newsletter" is scheduled for launch in 2 hours.',
        type: 'info',
        read: true,
        createdAt: new Date(Date.now() - 3600000),
      },
    ];
  }
}
