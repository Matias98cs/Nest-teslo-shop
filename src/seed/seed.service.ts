import { Injectable } from '@nestjs/common';
import { ProductsService } from 'src/products/products.service';
import { initialData } from './data/seed-data';

@Injectable()
export class SeedService {
  constructor(private readonly productsService: ProductsService) {}

  async executeSeed() {
    await this.insertNewProducts();
    return 'This action seeds the database';
  }

  private async insertNewProducts() {
    await this.productsService.deleteAllProducts();

    const products = initialData.products;

    const insertPromises = products.map((product) =>
      this.productsService.create(product),
    );

    await Promise.all(insertPromises);

    return true;
  }
}
