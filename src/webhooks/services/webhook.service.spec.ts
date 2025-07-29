import { Test, type TestingModule } from "@nestjs/testing"
import { WebhookService } from "./webhook.service"
import { getRepositoryToken } from "@nestjs/typeorm"
import { Webhook } from "../entities/webhook.entity"
import { ModerationLog } from "../entities/moderation-log.entity"
import { WebhookDispatcherService } from "./webhook-dispatcher.service"
import { ModerationService } from "./moderation.service"

describe("WebhookService", () => {
  let service: WebhookService
  let mockWebhookRepository
  let mockModerationLogRepository
  let mockWebhookDispatcherService
  let mockModerationService

  beforeEach(async () => {
    mockWebhookRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    }
    mockModerationLogRepository = {
      create: jest.fn(),
      save: jest.fn(),
    }
    mockWebhookDispatcherService = {
      dispatch: jest.fn(),
    }
    mockModerationService = {
      moderateMessage: jest.fn(),
      logModerationAction: jest.fn(),
      getModerationLogs: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: getRepositoryToken(Webhook),
          useValue: mockWebhookRepository,
        },
        {
          provide: getRepositoryToken(ModerationLog),
          useValue: mockModerationLogRepository,
        },
        {
          provide: WebhookDispatcherService,
          useValue: mockWebhookDispatcherService,
        },
        {
          provide: ModerationService,
          useValue: mockModerationService,
        },
      ],
    }).compile()

    service = module.get<WebhookService>(WebhookService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  // Add more specific tests here, e.g., for createWebhook, handleIncomingChatMessage, etc.
})
