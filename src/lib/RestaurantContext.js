'use client'

import { createContext, useContext } from 'react'

const RestaurantContext = createContext(null)

export function RestaurantProvider({ children, value }) {
  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  )
}

export function useRestaurant() {
  return useContext(RestaurantContext)
}
