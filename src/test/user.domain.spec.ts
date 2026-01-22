import { UserService } from '../user/user.service';

describe('User Domain', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService();
  });

  it('creates a user with capabilities', () => {
    const user = service.createUser({
      capabilities: ['event:create'],
    });

    expect(user.can('event:create')).toBe(true);
  });

  it('assigns event ownership', () => {
    const user = service.createUser();
    service.assignEventOwnership(user.id, 'event-123');

    expect(user.ownedEventIds).toContain('event-123');
  });

  it('assigns ticket ownership', () => {
    const user = service.createUser();
    service.assignTicketOwnership(user.id, 'ticket-abc');

    expect(user.ownedTicketIds).toContain('ticket-abc');
  });
});
