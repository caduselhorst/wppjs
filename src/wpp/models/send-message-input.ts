import { IsNotEmpty } from 'class-validator';

export class SendMessageInput {
  @IsNotEmpty({
    message: 'O número do contato é obrigatório',
  })
  contact: string;
  @IsNotEmpty({
    message: 'A mensagem é obrigatória',
  })
  message: string;
}
