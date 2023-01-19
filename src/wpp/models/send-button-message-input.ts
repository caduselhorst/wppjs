import { IsNotEmpty } from 'class-validator';
import { ButtonModel } from './button-model';

export class SendButtonMessageInput {
  @IsNotEmpty({
    message: 'É necessário informar o contato',
  })
  contact: string;
  @IsNotEmpty({
    message: 'É necessário informar o botão',
  })
  button: ButtonModel;
}
