import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from './board.entity';
import { List } from './list.entity';
import { Card } from './card.entity';
import { Comment } from './comment.entity';
import { CreateBoardDto } from './dto/create-board.dto';
import { CreateListDto } from './dto/create-list.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class BoardsService {
  constructor(
    @InjectRepository(Board) private readonly boardRepo: Repository<Board>,
    @InjectRepository(List) private readonly listRepo: Repository<List>,
    @InjectRepository(Card) private readonly cardRepo: Repository<Card>,
    @InjectRepository(Comment) private readonly commentRepo: Repository<Comment>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly notificationsService?: NotificationsService,
  ) { }

  private async verifyBoardOwnership(boardId: string, userId: string): Promise<boolean> {
    const board = await this.boardRepo.findOne({ where: { id: boardId, userId } });
    return !!board;
  }

  private async verifyListOwnership(listId: string, userId: string): Promise<boolean> {
    const list = await this.listRepo.findOne({ where: { id: listId } });
    if (!list) return false;
    const board = await this.boardRepo.findOne({ where: { id: list.boardId, userId } });
    return !!board;
  }

  private async verifyCardOwnership(cardId: string, userId: string): Promise<boolean> {
    const card = await this.cardRepo.findOne({ where: { id: cardId } });
    if (!card) return false;
    const list = await this.listRepo.findOne({ where: { id: card.listId } });
    if (!list) return false;
    const board = await this.boardRepo.findOne({ where: { id: list.boardId, userId } });
    return !!board;
  }

  async createBoard(userId: string, dto: CreateBoardDto) {
    const board = this.boardRepo.create({ ...dto, userId });
    return this.boardRepo.save(board);
  }

  async getBoardsForUser(userId: string) {
    return this.boardRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async getAllCardsForUser(userId: string): Promise<Card[]> {
    // Get cards from user's own boards OR cards assigned to the user
    return this.cardRepo.createQueryBuilder('c')
      .leftJoin('lists', 'l', 'l.id = c."listId"')
      .leftJoin('boards', 'b', 'b.id = l."boardId"')
      .where('b."userId" = :userId OR c.assignee::uuid = :userId', { userId })
      .getMany();
  }

  async getCardsAssignedToUser(userId: string): Promise<Card[]> {
    // Get all cards where this user is the assignee (from any board, including own)
    return this.cardRepo.find({ where: { assignee: userId } });
  }

  async getAllCardsForReports(userId: string, cardIds?: string[]): Promise<Card[]> {
    // For reports, get all cards from user's boards (to check completion status of assigned tasks)
    // This includes cards assigned to other users
    const query = this.cardRepo.createQueryBuilder('c')
      .leftJoin('lists', 'l', 'l.id = c."listId"')
      .leftJoin('boards', 'b', 'b.id = l."boardId"');

    if (cardIds && cardIds.length > 0) {
      // Also include specific cards by ID (from meeting notes), even if they're on other users' boards
      query.where('b."userId" = :userId OR c.id IN (:...cardIds)', { userId, cardIds });
    } else {
      query.where('b."userId" = :userId', { userId });
    }

    return query.getMany();
  }


  async getLists(userId: string, boardId: string) {
    if (!await this.verifyBoardOwnership(boardId, userId)) return [];
    return this.listRepo.find({ where: { boardId }, order: { order: 'ASC' } });
  }

  async createList(userId: string, boardId: string, dto: CreateListDto) {
    if (!await this.verifyBoardOwnership(boardId, userId)) return null;
    const list = this.listRepo.create({ ...dto, boardId });
    return this.listRepo.save(list);
  }

  async updateList(userId: string, listId: string, data: Partial<List>) {
    if (!await this.verifyListOwnership(listId, userId)) return null;
    const existing = await this.listRepo.findOne({ where: { id: listId } });
    if (!existing) return null;
    const merged = this.listRepo.merge(existing, data as any);
    return this.listRepo.save(merged);
  }

  async createCard(userId: string, listId: string, dto: CreateCardDto) {
    if (!await this.verifyListOwnership(listId, userId)) return null;
    const cardData: any = { ...dto, listId };
    if (cardData.order !== undefined && cardData.order !== null) {
      cardData.order = String(cardData.order);
    }
    const card = this.cardRepo.create(cardData) as unknown as Card;
    const saved = await this.cardRepo.save(card);

    // Only notify if task is assigned to someone other than the creator
    try {
      if (saved.assignee && saved.assignee !== userId && this.notificationsService) {
        const assignedByUser = await this.userRepo.findOne({ where: { id: userId } });
        const title = `New task assigned: ${saved.title}`;
        const body = saved.description || 'You have been assigned a new task';
        await this.notificationsService.createForUser(saved.assignee, title, body, {
          cardId: saved.id,
          type: 'task_assigned',
          category: 'Task',
          priority: saved.priority,
          dueDate: saved.dueDate,
          assignedBy: assignedByUser?.name || 'Someone',
        });
      }

      // Check if task is already overdue and notify immediately
      if (saved.dueDate && this.notificationsService) {
        const today = new Date().toISOString().split('T')[0];
        if (saved.dueDate < today) {
          const targetUser = saved.assignee || userId;
          const title = `Task overdue: ${saved.title}`;
          const body = `This task was due on ${saved.dueDate}`;
          await this.notificationsService.createForUser(targetUser, title, body, {
            cardId: saved.id,
            type: 'task_overdue',
            category: 'Task',
            dueDate: saved.dueDate,
          });
        }
      }
    } catch (e) {
      // ignore notification errors
    }
    return saved;
  }

  async updateCard(userId: string, cardId: string, data: Partial<Card>) {
    // Allow update if user owns the board OR is the assignee
    const isOwner = await this.verifyCardOwnership(cardId, userId);
    if (!isOwner) {
      const card = await this.cardRepo.findOne({ where: { id: cardId } });
      if (!card || card.assignee !== userId) return null;
    }
    const existing = await this.cardRepo.findOne({ where: { id: cardId } });
    if (!existing) return null;

    // Notify when task is assigned to a different user
    try {
      if (data.assignee && data.assignee !== userId && data.assignee !== existing.assignee && this.notificationsService) {
        const assignedByUser = await this.userRepo.findOne({ where: { id: userId } });
        const title = `Task assigned: ${existing.title}`;
        const body = existing.description || 'You have been assigned a task';
        const dueDate = data.dueDate || existing.dueDate;
        const priority = data.priority || existing.priority;
        await this.notificationsService.createForUser(data.assignee, title, body, {
          cardId: existing.id,
          type: 'task_assigned',
          category: 'Task',
          priority,
          dueDate,
          assignedBy: assignedByUser?.name || 'Someone',
        });
      }

      // Check if due date is being updated to an overdue date
      if (data.dueDate && this.notificationsService) {
        const today = new Date().toISOString().split('T')[0];
        if (data.dueDate < today && data.dueDate !== existing.dueDate) {
          const targetUser = existing.assignee || userId;
          const title = `Task overdue: ${existing.title}`;
          const body = `This task was due on ${data.dueDate}`;
          await this.notificationsService.createForUser(targetUser, title, body, {
            cardId: existing.id,
            type: 'task_overdue',
            category: 'Task',
            dueDate: data.dueDate,
          });
        }
      }
    } catch (e) {
      // ignore notification errors
    }

    // Logic: If card marked as completed (archived), mark all checklist items as done
    if (data.archived === true) {
      const checklist = data.checklist || existing.checklist;
      if (checklist && checklist.length > 0) {
        data.checklist = checklist.map(item => ({ ...item, done: true }));
      }
    }

    // Logic: If all checklist items are done, mark card as completed (archived)
    // If checklist is being updated
    if (data.checklist) {
      const hasItems = data.checklist.length > 0;
      const allDone = hasItems && data.checklist.every(item => item.done);

      if (hasItems && allDone) {
        // Only set if not explicitly set to false (though usually strictly done implies completed)
        if (data.archived !== false) {
          data.archived = true;
        }
      } else if (hasItems && !allDone) {
        // If items are not all done, ensure card is not archived (unless user explicitly sets it to true? 
        // usually unchecked item means not done)
        if (data.archived === undefined) {
          data.archived = false;
        }
      }
    }

    const merged = this.cardRepo.merge(existing, data);
    return this.cardRepo.save(merged);
  }

  async moveCard(userId: string, cardId: string, toListId: string, toOrder: number) {
    if (!await this.verifyCardOwnership(cardId, userId)) return null;
    if (!await this.verifyListOwnership(toListId, userId)) return null;
    const card = await this.cardRepo.findOne({ where: { id: cardId } });
    if (!card) return null;
    // Naive reorder: set card's listId and order. A production app should shift other orders.
    card.listId = toListId;
    card.order = String(toOrder);
    return this.cardRepo.save(card);
  }

  async getCardsForList(userId: string, listId: string) {
    if (!await this.verifyListOwnership(listId, userId)) return [];
    return this.cardRepo.find({ where: { listId }, order: { order: 'ASC' } });
  }

  async getCard(userId: string, cardId: string) {
    const isOwner = await this.verifyCardOwnership(cardId, userId);
    if (!isOwner) {
      // Allow assignee to view the card
      const card = await this.cardRepo.findOne({ where: { id: cardId } });
      if (!card || card.assignee !== userId) return null;
      return card;
    }
    return this.cardRepo.findOne({ where: { id: cardId } });
  }

  async addComment(cardId: string, userId: string, dto: CreateCommentDto) {
    const comment = this.commentRepo.create({ ...dto, cardId, userId });
    return this.commentRepo.save(comment);
  }

  async getComments(userId: string, cardId: string) {
    if (!await this.verifyCardOwnership(cardId, userId)) return [];
    return this.commentRepo.find({ where: { cardId }, order: { createdAt: 'ASC' } });
  }

  async deleteCard(userId: string, cardId: string) {
    if (!await this.verifyCardOwnership(cardId, userId)) return null;
    const card = await this.cardRepo.findOne({ where: { id: cardId } });
    if (!card) return null;
    await this.cardRepo.remove(card);
    return { success: true };
  }

  async archiveCard(userId: string, cardId: string) {
    if (!await this.verifyCardOwnership(cardId, userId)) return null;
    const card = await this.cardRepo.findOne({ where: { id: cardId } });
    if (!card) return null;

    card.archived = true;
    // Mark all checklist items as done
    if (card.checklist && card.checklist.length > 0) {
      card.checklist = card.checklist.map(item => ({ ...item, done: true }));
    }

    return this.cardRepo.save(card);
  }

  async deleteList(userId: string, listId: string) {
    if (!await this.verifyListOwnership(listId, userId)) return null;
    const list = await this.listRepo.findOne({ where: { id: listId } });
    if (!list) return null;
    // Delete all cards in this list first
    await this.cardRepo.delete({ listId });
    await this.listRepo.remove(list);
    return { success: true };
  }

  async duplicateCard(userId: string, cardId: string) {
    if (!await this.verifyCardOwnership(cardId, userId)) return null;
    const original = await this.cardRepo.findOne({ where: { id: cardId } });
    if (!original) return null;
    const duplicate = this.cardRepo.create({
      ...original,
      id: undefined,
      title: `${original.title} (Copy)`,
      createdAt: undefined,
      updatedAt: undefined,
    });
    return this.cardRepo.save(duplicate);
  }

  async updateBoard(userId: string, boardId: string, data: Partial<Board>) {
    if (!await this.verifyBoardOwnership(boardId, userId)) return null;
    const existing = await this.boardRepo.findOne({ where: { id: boardId } });
    if (!existing) return null;
    const merged = this.boardRepo.merge(existing, data as any);
    return this.boardRepo.save(merged);
  }

  async deleteBoard(userId: string, boardId: string) {
    if (!await this.verifyBoardOwnership(boardId, userId)) return null;
    const board = await this.boardRepo.findOne({ where: { id: boardId } });
    if (!board) return null;
    // delete lists and cards under this board
    const lists = await this.listRepo.find({ where: { boardId } });
    for (const l of lists) {
      await this.cardRepo.delete({ listId: l.id });
    }
    await this.listRepo.delete({ boardId });
    await this.boardRepo.remove(board);
    return { success: true };
  }

  async getOrCreateDailyWorkBoard(userId: string): Promise<{ board: Board; list: List }> {
    // Find existing "Daily Work" board
    console.log('[BoardsService] Looking for Daily Work board for userId:', userId);
    let board = await this.boardRepo.findOne({ where: { userId, title: 'Daily Work' } });

    if (!board) {
      // Create the board
      console.log('[BoardsService] Creating new Daily Work board');
      board = this.boardRepo.create({ userId, title: 'Daily Work' });
      board = await this.boardRepo.save(board);
      console.log('[BoardsService] Created board:', board.id);
    } else {
      console.log('[BoardsService] Found existing board:', board.id);
    }

    // Find or create default "To Do" list
    let list = await this.listRepo.findOne({ where: { boardId: board.id, title: 'To Do' } });

    if (!list) {
      console.log('[BoardsService] Creating To Do list');
      list = this.listRepo.create({ boardId: board.id, title: 'To Do', order: 0 });
      list = await this.listRepo.save(list);
      console.log('[BoardsService] Created list:', list.id);
    } else {
      console.log('[BoardsService] Found existing list:', list.id);
    }

    return { board, list };
  }

  async createCardsFromWorkLog(userId: string, tasks: string[]): Promise<Card[]> {
    console.log('[BoardsService] createCardsFromWorkLog called with', tasks.length, 'tasks');
    const { list } = await this.getOrCreateDailyWorkBoard(userId);

    const cards: Card[] = [];
    for (const task of tasks) {
      if (!task.trim()) continue;

      console.log('[BoardsService] Creating card:', task.trim());
      // default due date: tomorrow (from now)
      const due = new Date();
      due.setDate(due.getDate() + 1);
      const dueDate = due.toISOString().split('T')[0];

      const card = this.cardRepo.create({
        listId: list.id,
        title: task.trim(),
        order: String(Date.now()), // simple ordering as bigint
        archived: false,
        dueDate,
      }) as Card;
      const saved = await this.cardRepo.save(card);
      console.log('[BoardsService] Saved card:', saved.id);
      cards.push(saved);
    }

    console.log('[BoardsService] Created total of', cards.length, 'cards');
    return cards;
  }

  async syncWorkLogTasks(userId: string, workLogDate: string, tasks: string[]): Promise<Card[]> {
    console.log('[BoardsService] Syncing work log tasks for date:', workLogDate);
    const { list } = await this.getOrCreateDailyWorkBoard(userId);

    // Delete existing tasks created from this work log date
    const existingTasks = await this.cardRepo.find({
      where: { listId: list.id, workLogDate },
    });

    if (existingTasks.length > 0) {
      console.log('[BoardsService] Deleting', existingTasks.length, 'existing tasks for date:', workLogDate);
      await this.cardRepo.remove(existingTasks);
    }

    // Create new tasks
    const cards: Card[] = [];
    for (const task of tasks) {
      if (!task.trim()) continue;

      console.log('[BoardsService] Creating card:', task.trim());
      // due date should be the day after the work log date
      const d = new Date(workLogDate);
      d.setDate(d.getDate() + 1);
      const due = d.toISOString().split('T')[0];

      const card = this.cardRepo.create({
        listId: list.id,
        title: task.trim(),
        order: String(Date.now() + cards.length), // simple ordering as bigint
        archived: false,
        workLogDate, // Track which work log created this
        dueDate: due,
      }) as Card;
      const saved = await this.cardRepo.save(card);
      console.log('[BoardsService] Saved card:', saved.id);
      cards.push(saved);
    }

    console.log('[BoardsService] Synced total of', cards.length, 'cards');
    return cards;
  }

  async getOverdueWorkLogWarnings(userId: string): Promise<any[]> {
    // Find cards in the user's Daily Work board that were created from work logs,
    // are not archived, and whose dueDate is before today.
    const qb = this.cardRepo.createQueryBuilder('c')
      .select(['c.id', 'c.title', 'c.listId', 'c.workLogDate', 'c.dueDate'])
      .innerJoin('lists', 'l', 'l.id = c."listId"')
      .innerJoin('boards', 'b', 'b.id = l."boardId"')
      .where('b."userId" = :userId', { userId })
      .andWhere('b.title = :boardTitle', { boardTitle: 'Daily Work' })
      .andWhere('c."workLogDate" IS NOT NULL')
      .andWhere('c.archived = false')
      .andWhere('c."dueDate" < CURRENT_DATE')
      .orderBy('c."dueDate"', 'ASC');

    const rows = await qb.getRawMany();
    return rows.map(r => ({
      id: r.c_id,
      title: r.c_title,
      listId: r.c_listId,
      workLogDate: r.c_workLogDate,
      dueDate: r.c_dueDate
    }));
  }

  // System methods that bypass ownership checks (for cross-user operations like meeting tasks)
  async getListsForBoard(boardId: string) {
    return this.listRepo.find({ where: { boardId }, order: { order: 'ASC' } });
  }

  async createListForBoard(boardId: string, dto: CreateListDto) {
    const list = this.listRepo.create({ ...dto, boardId });
    return this.listRepo.save(list);
  }

  async createCardForList(listId: string, dto: CreateCardDto, creatorId?: string) {
    const cardData: any = { ...dto, listId };
    if (cardData.order !== undefined && cardData.order !== null) {
      cardData.order = String(cardData.order);
    }
    const card = this.cardRepo.create(cardData) as unknown as Card;
    const saved = await this.cardRepo.save(card);

    // Debug logging
    console.log('createCardForList DEBUG:', {
      cardTitle: saved.title,
      assignee: saved.assignee,
      creatorId: creatorId,
      willNotify: saved.assignee && saved.assignee !== creatorId
    });

    // Only notify if task is assigned to someone other than the creator
    try {
      if (saved.assignee && saved.assignee !== creatorId && this.notificationsService) {
        const title = `New task assigned: ${saved.title}`;
        const body = saved.description || 'You have been assigned a new task';
        console.log('Sending notification to:', saved.assignee, 'Title:', title);
        await this.notificationsService.createForUser(saved.assignee, title, body, {
          cardId: saved.id,
          type: 'task_assigned',
          category: 'Task'
        });
        console.log('Notification sent successfully');
      } else {
        console.log('Skipping notification - assignee same as creator or missing');
      }

      // Check if task is already overdue and notify immediately
      if (saved.dueDate && this.notificationsService) {
        const today = new Date().toISOString().split('T')[0];
        if (saved.dueDate < today) {
          const targetUser = saved.assignee || creatorId;
          if (targetUser) {
            const title = `Task overdue: ${saved.title}`;
            const body = `This task was due on ${saved.dueDate}`;
            await this.notificationsService.createForUser(targetUser, title, body, {
              cardId: saved.id,
              type: 'task_overdue',
              category: 'Task',
              date: today,
            });
          }
        }
      }
    } catch (e) {
      // ignore
    }
    return saved;
  }

  async updateCardById(cardId: string, data: Partial<Card>, updaterId?: string) {
    const existing = await this.cardRepo.findOne({ where: { id: cardId } });
    if (!existing) return null;

    // Notify when task is assigned to a different user
    try {
      if (data.assignee && data.assignee !== existing.assignee && this.notificationsService) {
        // Only notify if assignee is different from the person who updated it (if known)
        // If updaterId is not provided or is different from the new assignee, send notification
        if (!updaterId || data.assignee !== updaterId) {
          const title = `Task assigned: ${existing.title}`;
          const body = existing.description || 'You have been assigned a task';
          await this.notificationsService.createForUser(data.assignee, title, body, {
            cardId: existing.id,
            type: 'task_assigned',
            category: 'Task'
          });
        }
      }

      // Check if due date is being updated to an overdue date
      if (data.dueDate && this.notificationsService) {
        const today = new Date().toISOString().split('T')[0];
        if (data.dueDate < today && data.dueDate !== existing.dueDate) {
          const targetUser = existing.assignee || updaterId;
          if (targetUser) {
            const title = `Task overdue: ${existing.title}`;
            const body = `This task was due on ${data.dueDate}`;
            await this.notificationsService.createForUser(targetUser, title, body, {
              cardId: existing.id,
              type: 'task_overdue',
              category: 'Task',
            });
          }
        }
      }
    } catch (e) {
      // ignore notification errors
    }

    const merged = this.cardRepo.merge(existing, data);
    return this.cardRepo.save(merged);
  }

  // Delete card by id without ownership checks (system operation)
  async deleteCardById(cardId: string) {
    const card = await this.cardRepo.findOne({ where: { id: cardId } });
    if (!card) return null;
    await this.cardRepo.remove(card);
    return { success: true };
  }
}

