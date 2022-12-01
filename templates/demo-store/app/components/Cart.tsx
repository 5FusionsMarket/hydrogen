import clsx from 'clsx';
import {useRef, useState} from 'react';
import {useScroll} from 'react-use';
import {flattenConnection, Image, Money} from '@shopify/hydrogen-react';
import {
  Button,
  Heading,
  IconRemove,
  Text,
  Link,
  FeaturedProducts,
} from '~/components';
import {getInputStyleClasses} from '~/lib/utils';
import type {
  Cart as CartType,
  CartCost,
  CartLine,
} from '@shopify/hydrogen-react/storefront-api-types';
import {
  CartDiscountCodesUpdateForm,
  CartLinesRemoveForm,
  CartLinesUpdateForm,
  useCartDiscountCodesUpdating,
  useCartLineRemoving,
  useCartLinesAdding,
  useCartLinesRemoving,
  useCartLineUpdating,
  useOptimisticCartLinesAdding,
} from '.hydrogen/cart';

type Layouts = 'page' | 'drawer';

export function Cart({
  layout,
  onClose,
  cart,
}: {
  layout: Layouts;
  onClose?: () => void;
  cart: CartType | null;
}) {
  const linesCount = cart?.lines?.edges?.length || 0;
  const {linesAdding} = useCartLinesAdding();
  const {linesRemoving} = useCartLinesRemoving();
  const addingFirstLine = Boolean(linesCount === 0 && linesAdding.length);
  const removingLastLine = Boolean(linesCount === 1 && linesRemoving.length);

  // a lines condition based on optimistic lines
  const hasLines = Boolean(
    (linesCount || addingFirstLine) && !removingLastLine,
  );

  return (
    <>
      <CartEmpty hidden={hasLines} onClose={onClose} layout={layout} />
      <CartDetails cart={cart} layout={layout} />
    </>
  );
}

export function CartDetails({
  layout,
  cart,
}: {
  layout: Layouts;
  cart: CartType | null;
}) {
  // @todo: get optimistic cart cost
  const isZeroCost = !cart || cart?.cost?.subtotalAmount?.amount === '0.0';

  const container = {
    drawer: 'grid grid-cols-1 h-screen-no-nav grid-rows-[1fr_auto]',
    page: 'w-full pb-12 grid md:grid-cols-2 md:items-start gap-8 md:gap-8 lg:gap-12',
  };

  return (
    <div className={container[layout]}>
      <CartLines lines={cart?.lines} layout={layout} />
      {!isZeroCost && (
        <CartSummary cost={cart.cost} layout={layout}>
          <CartDiscounts discountCodes={cart.discountCodes} />
          <CartCheckoutActions checkoutUrl={cart.checkoutUrl} />
        </CartSummary>
      )}
    </div>
  );
}

/**
 * Temporary discount UI
 * @param discountCodes the current discount codes applied to the cart
 * @todo rework when a design is ready
 */
function CartDiscounts({
  discountCodes,
}: {
  discountCodes: CartType['discountCodes'];
}) {
  const {discountCodesUpdating} = useCartDiscountCodesUpdating();
  const [hovered, setHovered] = useState(false);

  const discounts = discountCodesUpdating
    ? discountCodesUpdating
    : discountCodes;

  const optimisticDiscounts =
    discounts?.map(({code}) => code).join(', ') || null;

  return (
    <>
      {/* Have existing discount, display it with a remove option */}
      <dl className={clsx(optimisticDiscounts ? 'grid' : 'hidden')}>
        <div className="flex items-center justify-between font-medium">
          <Text as="dt">Discount(s)</Text>
          <div
            className="flex items-center justify-between"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <CartDiscountCodesUpdateForm
              className={hovered ? 'block' : 'hidden'}
              discountCodes={[]}
            >
              {() => (
                <button>
                  <IconRemove
                    aria-hidden="true"
                    style={{height: 18, marginRight: 4}}
                  />
                </button>
              )}
            </CartDiscountCodesUpdateForm>
            <Text as="dd">{optimisticDiscounts}</Text>
          </div>
        </div>
      </dl>

      {/* No discounts, show an input to apply a discount */}
      <CartDiscountCodesUpdateForm>
        {() => (
          <div
            className={clsx(
              optimisticDiscounts ? 'hidden' : 'flex',
              'items-center justify-between',
            )}
          >
            <input
              className={getInputStyleClasses()}
              type="text"
              name="discountCodes"
            />
            <button className="w-[150px] flex justify-end">
              <Text size="fine">Apply Discount</Text>
            </button>
          </div>
        )}
      </CartDiscountCodesUpdateForm>
    </>
  );
}

function CartLines({
  layout = 'drawer',
  lines: cartLines,
}: {
  layout: Layouts;
  lines: CartType['lines'] | undefined;
}) {
  const currentLines = cartLines ? flattenConnection(cartLines) : [];
  const {optimisticLinesNew} = useOptimisticCartLinesAdding(currentLines);
  const scrollRef = useRef(null);
  const {y} = useScroll(scrollRef);

  const className = clsx([
    y > 0 ? 'border-t' : '',
    layout === 'page'
      ? 'flex-grow md:translate-y-4'
      : 'px-6 pb-6 sm-max:pt-2 overflow-auto transition md:px-12',
  ]);

  return (
    <section
      ref={scrollRef}
      aria-labelledby="cart-contents"
      className={className}
    >
      <ul className="grid gap-6 md:gap-10">
        {optimisticLinesNew.map((line) => (
          <CartLineItem key={line.id} line={line as CartLine} optimistic />
        ))}
        {currentLines.map((line) => (
          <CartLineItem key={line.id} line={line as CartLine} />
        ))}
      </ul>
    </section>
  );
}

function CartCheckoutActions({checkoutUrl}: {checkoutUrl: string}) {
  if (!checkoutUrl) return null;

  return (
    <div className="flex flex-col mt-2">
      <a href={checkoutUrl} target="_self">
        <Button as="span" width="full">
          Continue to Checkout
        </Button>
      </a>
      {/* @todo: <CartShopPayButton cart={cart} /> */}
    </div>
  );
}

function CartSummary({
  cost,
  layout,
  children = null,
}: {
  children?: React.ReactNode;
  cost: CartCost;
  layout: Layouts;
}) {
  const summary = {
    drawer: 'grid gap-4 p-6 border-t md:px-12',
    page: 'sticky top-nav grid gap-6 p-4 md:px-6 md:translate-y-4 bg-primary/5 rounded w-full',
  };

  return (
    <section aria-labelledby="summary-heading" className={summary[layout]}>
      <h2 id="summary-heading" className="sr-only">
        Order summary
      </h2>
      <dl className="grid">
        <div className="flex items-center justify-between font-medium">
          <Text as="dt">Subtotal</Text>
          <Text as="dd" data-test="subtotal">
            {cost?.subtotalAmount?.amount ? (
              <Money data={cost?.subtotalAmount} />
            ) : (
              '-'
            )}
          </Text>
        </div>
      </dl>
      {children}
    </section>
  );
}

function CartLineItem({
  line,
  optimistic = false,
}: {
  line: CartLine;
  optimistic?: boolean;
}) {
  const {lineRemoving} = useCartLineRemoving(line);

  if (!line?.id) return null;

  const {id, quantity, merchandise} = line;

  if (typeof quantity === 'undefined' || !merchandise?.product) return null;

  return (
    <li key={id} className={clsx(['flex gap-4', lineRemoving ? 'hidden' : ''])}>
      <div className="flex-shrink">
        {merchandise.image && (
          <Image
            width={220}
            height={220}
            data={merchandise.image}
            className="object-cover object-center w-24 h-24 border rounded md:w-28 md:h-28"
            alt={merchandise.title}
          />
        )}
      </div>

      <div className="flex justify-between flex-grow">
        <div className="grid gap-2">
          <Heading as="h3" size="copy">
            {merchandise?.product?.handle ? (
              <Link to={`/products/${merchandise.product.handle}`}>
                {merchandise?.product?.title || ''}
              </Link>
            ) : (
              <Text>{merchandise?.product?.title || ''}</Text>
            )}
          </Heading>

          <div className="grid pb-2">
            {(merchandise?.selectedOptions || []).map((option) => (
              <Text color="subtle" key={option.name}>
                {option.name}: {option.value}
              </Text>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex justify-start text-copy">
              <CartLineQuantityAdjust line={line} optimistic={optimistic} />
            </div>
            <CartLineRemove lineIds={[id]} />
          </div>
        </div>
        <Text>
          <CartLinePrice line={line} as="span" />
        </Text>
      </div>
    </li>
  );
}

function CartLineRemove({lineIds}: {lineIds: CartLine['id'][]}) {
  return (
    <CartLinesRemoveForm lineIds={lineIds}>
      {({state}) => (
        <button
          className="flex items-center justify-center w-10 h-10 border rounded"
          type="submit"
          disabled={state !== 'idle'}
        >
          <span className="sr-only">
            {state === 'loading' ? 'Removing' : 'Remove'}
          </span>
          <IconRemove aria-hidden="true" />
        </button>
      )}
    </CartLinesRemoveForm>
  );
}

function CartLineQuantityAdjust({
  line,
  optimistic,
}: {
  optimistic: boolean;
  line: CartLine;
}) {
  const {lineUpdating} = useCartLineUpdating(line);
  if (!line || typeof line?.quantity === 'undefined') return null;
  const {id: lineId, quantity: actualQuantity} = line;
  const quantity =
    typeof lineUpdating?.quantity !== 'undefined'
      ? lineUpdating.quantity
      : actualQuantity;

  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));

  return (
    <>
      <label htmlFor={`quantity-${lineId}`} className="sr-only">
        Quantity, {quantity}
      </label>
      <div className="flex items-center border rounded">
        <CartLinesUpdateForm lines={[{id: lineId, quantity: prevQuantity}]}>
          {() => (
            <button
              name="decrease-quantity"
              aria-label="Decrease quantity"
              className="w-10 h-10 transition text-primary/50 hover:text-primary disabled:text-primary/10"
              value={prevQuantity}
              disabled={quantity <= 1 || optimistic}
            >
              <span>&#8722;</span>
            </button>
          )}
        </CartLinesUpdateForm>

        <div className="px-2 text-center" data-test="item-quantity">
          {quantity}
        </div>

        <CartLinesUpdateForm lines={[{id: lineId, quantity: nextQuantity}]}>
          {() => (
            <button
              className="w-10 h-10 transition text-primary/50 hover:text-primary"
              name="increase-quantity"
              value={nextQuantity}
              aria-label="Increase quantity"
              disabled={optimistic}
            >
              <span>&#43;</span>
            </button>
          )}
        </CartLinesUpdateForm>
      </div>
    </>
  );
}

function CartLinePrice({
  line,
  priceType = 'regular',
  ...passthroughProps
}: {
  line: CartLine;
  priceType?: 'regular' | 'compareAt';
  [key: string]: any;
}) {
  const {lineUpdating} = useCartLineUpdating(line);

  if (!line?.cost?.amountPerQuantity || !line?.cost?.totalAmount) return null;

  // optimistic line item price
  const optimisticTotalAmount =
    typeof lineUpdating?.quantity !== 'undefined'
      ? {
          amount: String(
            (
              lineUpdating.quantity *
              parseFloat(line.cost.amountPerQuantity.amount)
            ).toFixed(2),
          ),
          currencyCode: line.cost.amountPerQuantity.currencyCode,
        }
      : line.cost.totalAmount;

  const moneyV2 =
    priceType === 'regular'
      ? optimisticTotalAmount
      : line.cost.compareAtAmountPerQuantity;

  if (moneyV2 == null) {
    return null;
  }

  return <Money withoutTrailingZeros {...passthroughProps} data={moneyV2} />;
}

export function CartEmpty({
  hidden = false,
  layout = 'drawer',
  onClose,
}: {
  hidden: boolean;
  layout?: Layouts;
  onClose?: () => void;
}) {
  const scrollRef = useRef(null);
  const {y} = useScroll(scrollRef);

  const container = {
    drawer: clsx([
      'content-start gap-4 px-6 pb-8 transition overflow-y-scroll md:gap-12 md:px-12 h-screen-no-nav md:pb-12',
      y > 0 ? 'border-t' : '',
    ]),
    page: clsx([
      hidden ? '' : 'grid',
      `pb-12 w-full md:items-start gap-4 md:gap-8 lg:gap-12`,
    ]),
  };

  return (
    <div ref={scrollRef} className={container[layout]} hidden={hidden}>
      <section className="grid gap-6">
        <Text format>
          Looks like you haven&rsquo;t added anything yet, let&rsquo;s get you
          started!
        </Text>
        <div>
          <Button onClick={onClose}>Continue shopping</Button>
        </div>
      </section>
      <section className="grid gap-8 pt-4">
        <FeaturedProducts
          count={4}
          heading="Shop Best Sellers"
          layout={layout}
          onClose={onClose}
          sortKey="BEST_SELLING"
        />
      </section>
    </div>
  );
}