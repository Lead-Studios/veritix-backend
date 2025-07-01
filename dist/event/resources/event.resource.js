"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventResource = void 0;
class EventResource {
    static toResponse(event) {
        return {
            id: event.id,
            name: event.name,
            images: event.images ? event.images.map(img => img.id) : [],
        };
    }
    static toArray(events) {
        return events.map(EventResource.toResponse);
    }
}
exports.EventResource = EventResource;
//# sourceMappingURL=event.resource.js.map