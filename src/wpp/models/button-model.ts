import { IsNotEmpty, IsArray } from 'class-validator';

export class ButtonModel {
  @IsNotEmpty({
    message: 'É necessário informar o título',
  })
  title: string;
  @IsNotEmpty({
    message: 'É necessário informar um corpo',
  })
  body: string;
  @IsNotEmpty({
    message: 'É necessário informar um rodapé',
  })
  footer: string;
  @IsArray({
    message: 'Deve ser um array',
  })
  buttons: ButtonModel[];
}
