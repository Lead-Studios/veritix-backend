import { Controller, Post, Body, Get, Param, Put, Delete, Query } from "@nestjs/common"
import type { FraudService } from "./fraud.service"
import type { AnalyzeTransactionDto } from "./dto/analyze-transaction.dto"
import type { CreateFraudRuleDto } from "./dto/create-fraud-rule.dto"
import type { UpdateFraudRuleDto } from "./dto/update-fraud-rule.dto"

@Controller("fraud")
export class FraudController {
  constructor(private readonly fraudService: FraudService) {}

  @Post('analyze')
  async analyzeTransaction(@Body() analyzeTransactionDto: AnalyzeTransactionDto) {
    return this.fraudService.analyzeTransaction(analyzeTransactionDto);
  }

  @Get("logs")
  async getFraudLogs(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.fraudService.getFraudLogs({
      userId,
      status,
      startDate,
      endDate,
      page: +page,
      limit: +limit,
    })
  }

  @Get("rules")
  async getFraudRules() {
    return this.fraudService.getFraudRules()
  }

  @Post('rules')
  async createFraudRule(@Body() createFraudRuleDto: CreateFraudRuleDto) {
    return this.fraudService.createFraudRule(createFraudRuleDto);
  }

  @Put("rules/:id")
  async updateFraudRule(@Param('id') id: string, @Body() updateFraudRuleDto: UpdateFraudRuleDto) {
    return this.fraudService.updateFraudRule(id, updateFraudRuleDto)
  }

  @Delete('rules/:id')
  async deleteFraudRule(@Param('id') id: string) {
    return this.fraudService.deleteFraudRule(id);
  }

  @Get("stats")
  async getFraudStats(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.fraudService.getFraudStats(startDate, endDate)
  }
}

