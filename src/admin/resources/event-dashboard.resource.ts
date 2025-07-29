export class EventDashboardResource {
  static toResponse({ event, totalTicketsSold, totalRevenue, totalProfit, ticketsAvailable, eventImage }) {
    return {
      event: {
        id: event.id,
        name: event.name,
        date: event.date,
        location: {
          country: event.country,
          state: event.state,
          street: event.street,
          localGovernment: event.localGovernment,
        },
        image: eventImage,
      },
      totalTicketsSold,
      totalRevenue,
      totalProfit,
      ticketsAvailable,
    };
  }
} 