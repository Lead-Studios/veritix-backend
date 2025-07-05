"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateEventDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_event_dto_1 = require("./create-event.dto");
class UpdateEventDto extends (0, mapped_types_1.PartialType)(create_event_dto_1.CreateEventDto) {
}
exports.UpdateEventDto = UpdateEventDto;
//# sourceMappingURL=update-event.dto.js.map