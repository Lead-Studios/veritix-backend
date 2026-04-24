import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Order, OrderStatus } from "./entities/order.entity";

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async findByUser(
    userId: string,
    query: { page?: number; limit?: number; status?: OrderStatus },
  ) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const qb = this.orderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.items", "item")
      .leftJoinAndSelect("item.ticketType", "ticketType")
      .where("order.userId = :userId", { userId })
      .orderBy("order.createdAt", "DESC")
      .skip(skip)
      .take(limit);

    if (status) {
      qb.andWhere("order.status = :status", { status });
    }

    const [orders, total] = await qb.getManyAndCount();

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}