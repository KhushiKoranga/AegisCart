# API Documentation

Base URL: `http://localhost:5000/api`

**Success:** `{ "success": true, "data": ... }`
**Error:** `{ "success": false, "message": "Readable message", "code": "SOME_CODE" }`

Protected routes need the header `Authorization: Bearer <accessToken>`. Field names are camelCase.

Common status codes: 400 invalid input, 401 not logged in or token expired (`code: TOKEN_EXPIRED`), 403 not an admin, 404 not found (also used when a record belongs to someone else), 409 conflict (for example `OUT_OF_STOCK`), 429 too many requests, 503 a service is not configured.

## Authentication
| Method and path | Body | Notes |
|---|---|---|
| POST `/auth/register` | `name, email, password (8+), phone?` | Returns `{ user, accessToken, refreshToken }`. Always creates a CUSTOMER. |
| POST `/auth/login` | `email, password` | Customer login. Admin accounts are rejected here. |
| POST `/auth/admin/login` | `email, password` | Only ADMIN accounts. |
| POST `/auth/refresh` | `refreshToken` | Each refresh token works once; a new pair is returned. |
| POST `/auth/logout` | `refreshToken` | Revokes the refresh token. |

## Catalogue (public)
| Method and path | Notes |
|---|---|
| GET `/categories` | |
| GET `/products` | Query: `search, categoryId, minPrice, maxPrice, sort (newest/price_low/price_high), page, limit, tryOnOnly=true`. Prices use the flash-sale price when a sale is running. |
| GET `/products/:id` | Images, variants (each with `stockQuantity`, `garmentImageUrl`, `tryOnSupported`) and related products. |

## Cart (login)
| Method and path | Body |
|---|---|
| GET `/cart` | Items, `subtotal`, `total`, `itemCount`. |
| POST `/cart/items` | `variantId, quantity (1-10)`. Does **not** reserve stock. |
| PATCH `/cart/items/:id` | `quantity` |
| DELETE `/cart/items/:id` | |

## Wishlist (login)
GET `/wishlist` - POST `/wishlist` `{ productId }` - DELETE `/wishlist/:productId`

## Profile, addresses, notifications (login)
GET/PUT `/profile` - PUT `/profile/push-token` `{ fcmToken }` - GET/POST `/addresses` - PUT/DELETE `/addresses/:id` - GET `/notifications` - POST `/notifications/read`

## Orders (login)
| Method and path | Notes |
|---|---|
| POST `/orders` | Body `{ addressId }`, **header `Idempotency-Key` required**. Re-checks prices, reserves stock for every item in one transaction, creates the order as `PENDING_PAYMENT`. Returns 409 `OUT_OF_STOCK` if any item is short (nothing is reserved then). |
| GET `/orders`, GET `/orders/:id` | Own orders only. |
| POST `/orders/:id/cancel` | Only while `PENDING_PAYMENT`; returns the stock. |

Order statuses: `PENDING_PAYMENT, CONFIRMED (paid), SHIPPED, DELIVERED, CANCELLED, EXPIRED`.

## Payments
| Method and path | Notes |
|---|---|
| POST `/payments/create-order` | `{ orderId }` -> `{ keyId, razorpayOrderId, amountInPaise, currency }`. No money moves yet. |
| POST `/payments/verify` | `{ razorpayOrderId, razorpayPaymentId, razorpaySignature }`. The signature is verified; only then is the order marked paid. |
| POST `/payments/webhook` | Called by Razorpay. Signature header `x-razorpay-signature`, event id header `x-razorpay-event-id`. Duplicate events are ignored. |

## Virtual Try-On (login)
| Method and path | Notes |
|---|---|
| POST `/virtual-try-on/photos` | multipart: `photo` (JPEG/PNG/WebP, max 5 MB), `consentGiven=true`. Returns `{ id }`. |
| DELETE `/virtual-try-on/photos/:photoId` | Deletes the photo file. |
| POST `/virtual-try-on` | `{ photoId, productId, variantId? }`. Returns 202 with `status: "processing"`. 503 `TRYON_NOT_CONFIGURED` when no AI provider is set up. 422 when the chosen colour has no garment image. |
| GET `/virtual-try-on/:id` | Status `pending / processing / completed / failed`. Polling this also checks the AI provider. |
| GET `/virtual-try-on/:id/image` | The private result image (owner only). |
| GET `/virtual-try-on/history`, GET `/virtual-try-on/saved` | |
| POST / DELETE `/virtual-try-on/:id/save` | Save or unsave a favourite. |
| DELETE `/virtual-try-on/:id` | Deletes the record and its generated image. |

## Admin (ADMIN role, all under `/admin`)
`GET /dashboard` - `GET /reports/sales?days=30` - `GET /customers`
`GET/POST /categories`, `PUT/DELETE /categories/:id`
`GET/POST /products`, `GET/PUT/DELETE /products/:id`, `PATCH /products/:id/availability {isActive}`, `POST /products/:id/images {imageUrl}`, `DELETE /product-images/:imageId`
`GET/POST /products/:id/variants`, `PUT/DELETE /variants/:variantId`, `PATCH /variants/:variantId/stock {stockQuantity}`
`GET /inventory-logs`
`GET /orders?status=`, `GET /orders/:id`, `PATCH /orders/:id/status {status: SHIPPED | DELIVERED | CANCELLED}`
`GET/POST /flash-sales`, `PATCH /flash-sales/:id {isActive}`, `DELETE /flash-sales/:id`

`GET /health` returns `{ status: "ok" }`.
