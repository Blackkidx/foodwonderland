import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem, CartByRestaurant } from '@/types'

interface CartStore {
  cart: CartByRestaurant[]
  sessionId: string | null
  customerName: string | null
  tableNumber: number | null

  // Session
  setSession: (sessionId: string, customerName: string, tableNumber: number) => void
  clearSession: () => void

  // Cart
  addItem: (restaurantId: number, restaurantName: string, item: CartItem) => void
  removeItem: (restaurantId: number, menuId: number) => void
  updateQuantity: (restaurantId: number, menuId: number, quantity: number) => void
  clearRestaurant: (restaurantId: number) => void
  clearCart: () => void

  // Computed
  getTotalItems: () => number
  getRestaurantTotal: (restaurantId: number) => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cart: [],
      sessionId: null,
      customerName: null,
      tableNumber: null,

      setSession: (sessionId, customerName, tableNumber) =>
        set({ sessionId, customerName, tableNumber }),

      clearSession: () =>
        set({ sessionId: null, customerName: null, tableNumber: null, cart: [] }),

      addItem: (restaurantId, restaurantName, item) =>
        set((state) => {
          const existing = state.cart.find((r) => r.restaurantId === restaurantId)
          if (existing) {
            const existingItem = existing.items.find((i) => i.menuId === item.menuId)
            return {
              cart: state.cart.map((r) =>
                r.restaurantId === restaurantId
                  ? {
                      ...r,
                      items: existingItem
                        ? r.items.map((i) =>
                            i.menuId === item.menuId
                              ? { ...i, quantity: i.quantity + item.quantity }
                              : i
                          )
                        : [...r.items, item],
                    }
                  : r
              ),
            }
          }
          return {
            cart: [...state.cart, { restaurantId, restaurantName, items: [item] }],
          }
        }),

      removeItem: (restaurantId, menuId) =>
        set((state) => ({
          cart: state.cart
            .map((r) =>
              r.restaurantId === restaurantId
                ? { ...r, items: r.items.filter((i) => i.menuId !== menuId) }
                : r
            )
            .filter((r) => r.items.length > 0),
        })),

      updateQuantity: (restaurantId, menuId, quantity) =>
        set((state) => ({
          cart: state.cart.map((r) =>
            r.restaurantId === restaurantId
              ? {
                  ...r,
                  items: r.items.map((i) =>
                    i.menuId === menuId ? { ...i, quantity } : i
                  ),
                }
              : r
          ),
        })),

      clearRestaurant: (restaurantId) =>
        set((state) => ({
          cart: state.cart.filter((r) => r.restaurantId !== restaurantId),
        })),

      clearCart: () => set({ cart: [] }),

      getTotalItems: () => {
        const { cart } = get()
        return cart.reduce((total, r) => total + r.items.reduce((s, i) => s + i.quantity, 0), 0)
      },

      getRestaurantTotal: (restaurantId) => {
        const { cart } = get()
        const restaurant = cart.find((r) => r.restaurantId === restaurantId)
        if (!restaurant) return 0
        return restaurant.items.reduce((total, item) => total + item.price * item.quantity, 0)
      },
    }),
    { name: 'foodwonderland-cart' }
  )
)
