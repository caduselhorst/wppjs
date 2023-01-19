import { IsNotEmpty } from 'class-validator';

export class ButtonBodyModel {
  @IsNotEmpty({
    message: 'É necessário informar a descrição do botão',
  })
  body: string;
}
