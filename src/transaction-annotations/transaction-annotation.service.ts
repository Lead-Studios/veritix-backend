import { Injectable, BadRequestException } from '@nestjs/common';
import { Repository, ILike } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionNote } from '../entities/transaction-note.entity';
import { TransactionTag } from '../entities/transaction-tag.entity';
import { Transaction } from '../entities/transaction.entity';

@Injectable()
export class TransactionAnnotationService {
  constructor(
    @InjectRepository(TransactionNote)
    private noteRepo: Repository<TransactionNote>,

    @InjectRepository(TransactionTag)
    private tagRepo: Repository<TransactionTag>,

    @InjectRepository(Transaction)
    private txRepo: Repository<Transaction>,
  ) {}

  normalizeTag(tag: string) {
    return tag.toLowerCase().trim();
  }

  async addNote(txId: string, userId: string, content: string) {
    const note = this.noteRepo.create({ content, userId, transaction: { id: txId } });
    return this.noteRepo.save(note);
  }

  async addTag(txId: string, userId: string, tag: string) {
    tag = this.normalizeTag(tag);

    const exists = await this.tagRepo.findOne({
      where: { tag, userId, transaction: { id: txId } },
    });

    if (exists) return exists;

    const newTag = this.tagRepo.create({ tag, userId, transaction: { id: txId } });
    return this.tagRepo.save(newTag);
  }

  async removeTag(txId: string, userId: string, tag: string) {
    tag = this.normalizeTag(tag);

    return this.tagRepo.delete({
      tag,
      userId,
      transaction: { id: txId },
    });
  }

  async search(userId: string, query: any) {
    const qb = this.txRepo.createQueryBuilder('tx')
      .leftJoinAndSelect('tx.notes', 'notes')
      .leftJoinAndSelect('tx.tags', 'tags')
      .where('tx.userId = :userId', { userId });

    if (query.tag) {
      qb.andWhere('tags.tag = :tag', { tag: this.normalizeTag(query.tag) });
    }

    if (query.notes) {
      qb.andWhere('notes.content ILIKE :note', {
        note: `%${query.notes}%`,
      });
    }

    return qb.getMany();
  }

  async getUserTags(userId: string) {
    return this.tagRepo
      .createQueryBuilder('tag')
      .select('tag.tag', 'tag')
      .addSelect('COUNT(*)', 'count')
      .where('tag.userId = :userId', { userId })
      .groupBy('tag.tag')
      .getRawMany();
  }

  async bulkTag(userId: string, dto: any) {
    const tag = this.normalizeTag(dto.tag);

    const qb = this.txRepo.createQueryBuilder('tx')
      .where('tx.userId = :userId', { userId });

    if (dto.filter?.minAmount) {
      qb.andWhere('tx.amount >= :min', { min: dto.filter.minAmount });
    }

    if (dto.filter?.maxAmount) {
      qb.andWhere('tx.amount <= :max', { max: dto.filter.maxAmount });
    }

    const transactions = await qb.limit(200).getMany();

    if (transactions.length > 200) {
      throw new BadRequestException('Bulk tag limit exceeded (200)');
    }

    const tags = transactions.map(tx =>
      this.tagRepo.create({ tag, userId, transaction: tx }),
    );

    return this.tagRepo.save(tags);
  }

  async tagAnalytics(userId: string) {
    return this.txRepo
      .createQueryBuilder('tx')
      .leftJoin('tx.tags', 'tag')
      .select('tag.tag', 'tag')
      .addSelect('SUM(tx.amount)', 'total')
      .where('tx.userId = :userId', { userId })
      .groupBy('tag.tag')
      .getRawMany();
  }
}