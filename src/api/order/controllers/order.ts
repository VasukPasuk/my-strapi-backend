import {Strapi} from '@strapi/strapi';
import {Context} from 'koa';
import {factories} from '@strapi/strapi';

interface StrapiRequestContext extends Context {
  request: Context['request'] & {
    body: {
      data: CreateOrderDto;
    };
  };
}

export interface CreateOrderDto {
  phone: string;
  email: string;
  name: string;
  surname: string;
  region: string;
  locality: string;
  comment?: string;
  EDRPOY_CODE?: string;
  legal_entity?: string;
  street: string;
  floor?: string;
  house: string;
  apartment?: string;
  delivery_type: string;
  payment_type: string;
  department_adress?: string;
  total_price: number;
  total_items: number;
  items: OrderItemDto[];
}

export enum PlasticType {
  PLA = "PLA",
  CoPET = "CoPET",
}

export interface OrderItemDto {
  amount: number;
  price: number;
  plastic: PlasticType;
  product: number;
  color: number;
  variant: number;
}

export default factories.createCoreController('api::order.order', ({strapi}) => ({
  async create(ctx: StrapiRequestContext) {
    try {
      const {data} = ctx.request.body;
      if (!data || !data.items || !Array.isArray(data.items)) {
        return ctx.badRequest('Invalid order data');
      }

      const result = await strapi.db.transaction(async ({trx}) => {
        const order = await strapi.entityService.create('api::order.order', {
          data: {
            department_adress: data.department_adress,
            delivery_type: data.delivery_type,
            region: data.region,
            email: data.email,
            locality: data.locality,
            name: data.name,
            payment_type: data.payment_type,
            phone: data.phone,
            surname: data.surname,
            total_items: data.total_items,
            total_price: data.total_price,
            street: data.street,
            house: data.house,
            floor: data.floor,
            apartment: data.apartment,
            comment: data.comment,
            EDRPOY_CODE: data.EDRPOY_CODE,
            legal_entity: data.legal_entity,
          }, populate: ['items']
        }); // Pass transaction explicitly

        // Create order items within the same transaction
        const orderItemsPromises = data.items.map(item =>
          strapi.entityService.create('api::order-item.order-item', {
            data: {
              amount: item.amount,
              price: item.price,
              plastic: item.plastic,
              product: item.product,
              color: item.color,
              variant: item.variant,
              order: order.id, // Link to the parent order
            },
            populate: ['order'], // Add this to populate the relation
          }) // Pass transaction explicitly
        );

        // Wait for all order items to be created
        const orderItems = await Promise.all(orderItemsPromises);
        // Return the complete order with items
        return {
          order: {
            ...order,
            orderItems, // Include the created items
          },
        };
      });

      // Set the response
      ctx.body = {
        data: result,
      };

    } catch (error) {
      console.error('Order creation failed:', error);
      return ctx.throw(
        500,
        error instanceof Error ? error.message : 'An error occurred while creating the order'
      );
    }
  },
}));
