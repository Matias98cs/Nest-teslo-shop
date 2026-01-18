import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { MessagesWsService } from './messages-ws.service';
import { Server, Socket } from 'socket.io';
import { NewMessageDto } from './dtos/new-message.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'src/auth/interfaces';

@WebSocketGateway({ cors: true, namespace: '' })
export class MessagesWsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() wss: Server;

  constructor(
    private readonly messagesWsService: MessagesWsService,
    private readonly jwtService: JwtService,
  ) {}
  async handleConnection(client: Socket) {
    const token = client.handshake.headers.authentication as string;
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(token);
      await this.messagesWsService.registerClient(client, payload.id);
    } catch (error) {
      client.disconnect();
      return;
    }
    // console.log('Cliente Conetado', client.id);
    // console.log({ conectados: this.messagesWsService.getConnedtedClients() });

    // client.join('ventas');
    // client.join(client.id)
    // client.join(user.id) // se puede usar el id del user como identifacodor unico para la sala
    // this.wss.to('ventas').emit()

    this.wss.emit(
      'clients-updated',
      this.messagesWsService.getConnedtedClients(),
    );
  }
  handleDisconnect(client: Socket) {
    // console.log('Cliente Desconectado', client.id);
    this.messagesWsService.removeClient(client.id);
    // console.log({ conectados: this.messagesWsService.getConnedtedClients() });
    this.wss.emit(
      'clients-updated',
      this.messagesWsService.getConnedtedClients(),
    );
  }

  @SubscribeMessage('message-from-client')
  handleMessageFromClient(client: Socket, payload: NewMessageDto) {
    // Emite unicamente al cliente.
    // client.emit('message-from-server', {
    //   fullName: 'Soy Yo!',
    //   message: payload.message || 'no-message!!',
    // });

    // Emitir a todos, menos al cliente inical
    // client.broadcast.emit('message-from-server', {
    //   fullName: 'Soy Yo!',
    //   message: payload.message || 'no-message!!',
    // });

    this.wss.emit('message-from-server', {
      fullName: this.messagesWsService.getUserFullName(client.id),
      message: payload.message || 'no-message!!',
    });
  }
}
