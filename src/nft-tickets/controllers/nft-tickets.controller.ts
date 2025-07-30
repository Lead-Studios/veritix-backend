import { TransferNftTicketDto } from '../dto/transfer-nft-ticket.dto';
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { NftTicketsService } from '../services/nft-tickets.service';
import { MintNftTicketDto, NftTicketResponseDto, NftMintingConfigDto } from '../dto/mint-nft-ticket.dto';
import { NftMintingConfig } from '../entities/nft-minting-config.entity';
import { NftPlatform } from '../entities/nft-ticket.entity';

@ApiTags('NFT Tickets')
@Controller('nft-tickets')
export class NftTicketsController {
  constructor(private readonly nftTicketsService: NftTicketsService) {}

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer NFT ticket to another wallet' })
  @ApiBody({ type: TransferNftTicketDto })
  @ApiResponse({
    status: 200,
    description: 'NFT ticket transferred successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        transactionHash: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid ticket ID or recipient address',
  })
  @ApiResponse({
    status: 404,
    description: 'NFT ticket not found or ownership validation failed',
  })
  async transferNftTicketByDto(@Body() transferNftTicketDto: TransferNftTicketDto): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    return this.nftTicketsService.transferNftTicketByDto(transferNftTicketDto);
  }

  @Post('mint')
  @ApiOperation({ summary: 'Mint NFT ticket' })
  @ApiBody({ type: MintNftTicketDto })
  @ApiResponse({
    status: 201,
    description: 'NFT ticket minted successfully',
    type: NftTicketResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - NFT tickets not enabled or invalid data',
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found',
  })
  @HttpCode(HttpStatus.CREATED)
  async mintNftTicket(@Body() mintDto: MintNftTicketDto): Promise<NftTicketResponseDto> {
    return this.nftTicketsService.mintNftTicket(mintDto);
  }

  @Post(':nftTicketId/retry')
  @ApiOperation({ summary: 'Retry failed NFT minting' })
  @ApiParam({ name: 'nftTicketId', description: 'NFT ticket ID' })
  @ApiResponse({
    status: 200,
    description: 'NFT minting retried successfully',
    type: NftTicketResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Only failed tickets can be retried',
  })
  @ApiResponse({
    status: 404,
    description: 'NFT ticket not found',
  })
  async retryMinting(@Param('nftTicketId') nftTicketId: string): Promise<NftTicketResponseDto> {
    return this.nftTicketsService.retryMinting(nftTicketId);
  }

  @Get(':nftTicketId')
  @ApiOperation({ summary: 'Get NFT ticket by ID' })
  @ApiParam({ name: 'nftTicketId', description: 'NFT ticket ID' })
  @ApiResponse({
    status: 200,
    description: 'NFT ticket retrieved successfully',
    type: NftTicketResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'NFT ticket not found',
  })
  async getNftTicket(@Param('nftTicketId') nftTicketId: string): Promise<NftTicketResponseDto> {
    return this.nftTicketsService.getNftTicket(nftTicketId);
  }

  @Get('event/:eventId')
  @ApiOperation({ summary: 'Get NFT tickets by event' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'NFT tickets retrieved successfully',
    type: [NftTicketResponseDto],
  })
  async getNftTicketsByEvent(@Param('eventId') eventId: string): Promise<NftTicketResponseDto[]> {
    return this.nftTicketsService.getNftTicketsByEvent(eventId);
  }

  @Get('purchaser/:purchaserId')
  @ApiOperation({ summary: 'Get NFT tickets by purchaser' })
  @ApiParam({ name: 'purchaserId', description: 'Purchaser ID' })
  @ApiResponse({
    status: 200,
    description: 'NFT tickets retrieved successfully',
    type: [NftTicketResponseDto],
  })
  async getNftTicketsByPurchaser(@Param('purchaserId') purchaserId: string): Promise<NftTicketResponseDto[]> {
    return this.nftTicketsService.getNftTicketsByPurchaser(purchaserId);
  }

  @Post('event/:eventId/configure')
  @ApiOperation({ summary: 'Configure NFT minting for an event' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiBody({ type: NftMintingConfigDto })
  @ApiResponse({
    status: 201,
    description: 'NFT minting configuration saved successfully',
    type: NftMintingConfig,
  })
  @HttpCode(HttpStatus.CREATED)
  async configureNftMinting(
    @Param('eventId') eventId: string,
    @Body() config: Partial<NftMintingConfig>,
  ): Promise<NftMintingConfig> {
    return this.nftTicketsService.configureNftMinting(eventId, config);
  }

  @Get('event/:eventId/config')\n  @ApiOperation({ summary: 'Get NFT minting configuration for an event' })\n  @ApiParam({ name: 'eventId', description: 'Event ID' })\n  @ApiResponse({\n    status: 200,\n    description: 'NFT minting configuration retrieved successfully',\n    type: NftMintingConfig,\n  })\n  async getNftMintingConfig(@Param('eventId') eventId: string): Promise<NftMintingConfig | null> {\n    return this.nftTicketsService.getNftMintingConfig(eventId);\n  }\n\n  @Post(':nftTicketId/transfer')\n  @ApiOperation({ summary: 'Transfer NFT ticket' })\n  @ApiParam({ name: 'nftTicketId', description: 'NFT ticket ID' })\n  @ApiBody({\n    schema: {\n      type: 'object',\n      properties: {\n        fromAddress: { type: 'string' },\n        toAddress: { type: 'string' },\n      },\n      required: ['fromAddress', 'toAddress'],\n    },\n  })\n  @ApiResponse({\n    status: 200,\n    description: 'NFT ticket transferred successfully',\n    schema: {\n      type: 'object',\n      properties: {\n        success: { type: 'boolean' },\n        transactionHash: { type: 'string' },\n        error: { type: 'string' },\n      },\n    },\n  })\n  @ApiResponse({\n    status: 400,\n    description: 'Bad request - Transfer not allowed or ticket not minted',\n  })\n  @ApiResponse({\n    status: 404,\n    description: 'NFT ticket not found',\n  })\n  async transferNftTicket(\n    @Param('nftTicketId') nftTicketId: string,\n    @Body() transferData: { fromAddress: string; toAddress: string },\n  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {\n    return this.nftTicketsService.transferNftTicket(\n      nftTicketId,\n      transferData.fromAddress,\n      transferData.toAddress,\n    );\n  }\n\n  @Post(':nftTicketId/burn')\n  @ApiOperation({ summary: 'Burn NFT ticket' })\n  @ApiParam({ name: 'nftTicketId', description: 'NFT ticket ID' })\n  @ApiBody({\n    schema: {\n      type: 'object',\n      properties: {\n        ownerAddress: { type: 'string' },\n      },\n      required: ['ownerAddress'],\n    },\n  })\n  @ApiResponse({\n    status: 200,\n    description: 'NFT ticket burned successfully',\n    schema: {\n      type: 'object',\n      properties: {\n        success: { type: 'boolean' },\n        transactionHash: { type: 'string' },\n        error: { type: 'string' },\n      },\n    },\n  })\n  @ApiResponse({\n    status: 400,\n    description: 'Bad request - Burning not enabled for this event',\n  })
  @ApiResponse({
    status: 404,
    description: 'NFT ticket not found',
  })
  async burnNftTicket(
    @Param('nftTicketId') nftTicketId: string,
    @Body() burnData: { ownerAddress: string },
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    return this.nftTicketsService.burnNftTicket(nftTicketId, burnData.ownerAddress);
  }

  @Get('event/:eventId/stats')
  @ApiOperation({ summary: 'Get NFT minting statistics for an event' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({
    status: 200,
    description: 'NFT minting statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        pending: { type: 'number' },
        minting: { type: 'number' },
        minted: { type: 'number' },
        failed: { type: 'number' },
        transferred: { type: 'number' },
      },
    },
  })
  async getMintingStats(@Param('eventId') eventId: string): Promise<{
    total: number;
    pending: number;
    minting: number;
    minted: number;
    failed: number;
    transferred: number;
  }> {
    return this.nftTicketsService.getMintingStats(eventId);
  }

  @Get('platforms')
  @ApiOperation({ summary: 'Get supported NFT platforms' })
  @ApiResponse({
    status: 200,
    description: 'Supported platforms retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        platforms: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              value: { type: 'string' },
              label: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
      },
    },
  })
  async getSupportedPlatforms(): Promise<{
    platforms: Array<{
      value: string;
      label: string;
      description: string;
    }>;
  }> {
    return {
      platforms: [
        {
          value: NftPlatform.POLYGON,
          label: 'Polygon',
          description: 'Ethereum-compatible blockchain with low gas fees',
        },
        {
          value: NftPlatform.ZORA,
          label: 'Zora',
          description: 'NFT platform with advanced minting features',
        },
      ],
    };
  }
} 