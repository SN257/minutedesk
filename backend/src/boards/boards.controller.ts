import { Controller, Post, Get, Body, Req, Param, UseGuards, NotFoundException, Put, Delete, Query } from '@nestjs/common';
import { BoardsService } from './boards.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CreateBoardDto } from './dto/create-board.dto';
import { CreateListDto } from './dto/create-list.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('boards')
@UseGuards(AuthGuard)
export class BoardsController {
  constructor(private readonly svc: BoardsService) { }

  @Post()
  async createBoard(@Req() req: any, @Body() dto: CreateBoardDto) {
    return this.svc.createBoard(req.session.userId, dto);
  }

  @Post('for-user/:userId')
  async createBoardForUser(@Req() req: any, @Param('userId') userId: string, @Body() dto: CreateBoardDto) {
    return this.svc.createBoard(userId, dto);
  }

  @Get()
  async getBoards(@Req() req: any) {
    return this.svc.getBoardsForUser(req.session.userId);
  }

  @Get('for-user/:userId')
  async getBoardsForUser(@Req() req: any, @Param('userId') userId: string) {
    return this.svc.getBoardsForUser(userId);
  }

  @Get(':boardId/lists')
  async getLists(@Req() req: any, @Param('boardId') boardId: string) {
    return this.svc.getLists(req.session.userId, boardId);
  }

  @Get('lists/:listId/cards')
  async getCardsForList(@Req() req: any, @Param('listId') listId: string) {
    return this.svc.getCardsForList(req.session.userId, listId);
  }

  @Post(':boardId/lists')
  async createList(@Req() req: any, @Param('boardId') boardId: string, @Body() dto: CreateListDto) {
    return this.svc.createList(req.session.userId, boardId, dto);
  }

  @Post('lists/:listId/cards')
  async createCard(@Req() req: any, @Param('listId') listId: string, @Body() dto: CreateCardDto) {
    return this.svc.createCard(req.session.userId, listId, dto);
  }

  @Put('cards/:cardId/move')
  async moveCard(@Req() req: any, @Param('cardId') cardId: string, @Body() body: { toListId: string; toOrder: number }) {
    const moved = await this.svc.moveCard(req.session.userId, cardId, body.toListId, body.toOrder);
    if (!moved) throw new NotFoundException('Card not found');
    return moved;
  }

  @Put('cards/:cardId')
  async updateCard(@Req() req: any, @Param('cardId') cardId: string, @Body() body: Partial<any>) {
    const updated = await this.svc.updateCard(req.session.userId, cardId, body);
    if (!updated) throw new NotFoundException('Card not found');
    return updated;
  }

  @Get('cards/all')
  async getAllCards(@Req() req: any) {
    return this.svc.getAllCardsForUser(req.session.userId);
  }

  @Get('cards/all-for-reports')
  async getAllCardsForReports(@Req() req: any, @Query('cardIds') cardIds?: string) {
    const cardIdArray = cardIds ? cardIds.split(',').filter(id => id.trim()) : undefined;
    return this.svc.getAllCardsForReports(req.session.userId, cardIdArray);
  }


  @Get('cards/:cardId')
  async getCard(@Req() req: any, @Param('cardId') cardId: string) {
    const card = await this.svc.getCard(req.session.userId, cardId);
    if (!card) throw new NotFoundException('Card not found');
    return card;
  }

  @Post('cards/:cardId/comments')
  async addComment(@Req() req: any, @Param('cardId') cardId: string, @Body() dto: CreateCommentDto) {
    return this.svc.addComment(cardId, req.session.userId, dto);
  }

  @Get('cards/:cardId/comments')
  async getComments(@Req() req: any, @Param('cardId') cardId: string) {
    return this.svc.getComments(req.session.userId, cardId);
  }

  @Delete('cards/:cardId')
  async deleteCard(@Req() req: any, @Param('cardId') cardId: string) {
    const result = await this.svc.deleteCard(req.session.userId, cardId);
    if (!result) throw new NotFoundException('Card not found');
    return result;
  }

  @Put('cards/:cardId/archive')
  async archiveCard(@Req() req: any, @Param('cardId') cardId: string) {
    const archived = await this.svc.archiveCard(req.session.userId, cardId);
    if (!archived) throw new NotFoundException('Card not found');
    return archived;
  }

  @Delete('lists/:listId')
  async deleteList(@Req() req: any, @Param('listId') listId: string) {
    const result = await this.svc.deleteList(req.session.userId, listId);
    if (!result) throw new NotFoundException('List not found');
    return result;
  }

  @Put('lists/:listId')
  async updateList(@Req() req: any, @Param('listId') listId: string, @Body() body: Partial<any>) {
    const updated = await this.svc.updateList(req.session.userId, listId, body);
    if (!updated) throw new NotFoundException('List not found');
    return updated;
  }

  @Post('cards/:cardId/duplicate')
  async duplicateCard(@Req() req: any, @Param('cardId') cardId: string) {
    const duplicated = await this.svc.duplicateCard(req.session.userId, cardId);
    if (!duplicated) throw new NotFoundException('Card not found');
    return duplicated;
  }

  @Put(':boardId')
  async updateBoard(@Req() req: any, @Param('boardId') boardId: string, @Body() body: Partial<any>) {
    const updated = await this.svc.updateBoard(req.session.userId, boardId, body);
    if (!updated) throw new NotFoundException('Board not found');
    return updated;
  }

  @Delete(':boardId')
  async deleteBoard(@Req() req: any, @Param('boardId') boardId: string) {
    const result = await this.svc.deleteBoard(req.session.userId, boardId);
    if (!result) throw new NotFoundException('Board not found');
    return result;
  }

  @Get('daily-work/warnings')
  async getDailyWorkWarnings(@Req() req: any) {
    return this.svc.getOverdueWorkLogWarnings(req.session.userId);
  }

  // System endpoints for cross-user operations (e.g., meeting tasks)
  @Get('system/:boardId/lists')
  async getListsSystem(@Req() req: any, @Param('boardId') boardId: string) {
    return this.svc.getListsForBoard(boardId);
  }

  @Post('system/:boardId/lists')
  async createListSystem(@Req() req: any, @Param('boardId') boardId: string, @Body() dto: CreateListDto) {
    return this.svc.createListForBoard(boardId, dto);
  }

  @Post('system/lists/:listId/cards')
  async createCardSystem(@Req() req: any, @Param('listId') listId: string, @Body() dto: CreateCardDto) {
    // Pass the current user ID as the creator for notification purposes
    return this.svc.createCardForList(listId, dto, req.session.userId);
  }

  @Put('system/cards/:cardId')
  async updateCardSystem(@Req() req: any, @Param('cardId') cardId: string, @Body() body: Partial<any>) {
    const updated = await this.svc.updateCardById(cardId, body, req.session.userId);
    if (!updated) throw new NotFoundException('Card not found');
    return updated;
  }

  @Delete('system/cards/:cardId')
  async deleteCardSystem(@Req() req: any, @Param('cardId') cardId: string) {
    const res = await this.svc.deleteCardById(cardId);
    if (!res) throw new NotFoundException('Card not found');
    return res;
  }
}
