"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const database_module_1 = require("./database.module");
const typeorm_1 = require("@nestjs/typeorm");
const gallery_image_entity_1 = require("./event/entities/gallery-image.entity");
const gallery_service_1 = require("./event/services/gallery.service");
const event_controller_1 = require("./event/controllers/event.controller");
const gallery_controller_1 = require("./event/controllers/gallery.controller");
const event_service_1 = require("./event/services/event.service");
const event_entity_1 = require("./event/entities/event.entity");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule,
            typeorm_1.TypeOrmModule.forFeature([event_entity_1.Event, gallery_image_entity_1.GalleryImage]),
        ],
        controllers: [app_controller_1.AppController, gallery_controller_1.GalleryController, event_controller_1.EventController],
        providers: [app_service_1.AppService, gallery_service_1.GalleryService, event_service_1.EventService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map