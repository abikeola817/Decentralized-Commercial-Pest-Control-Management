import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock contract-call responses
const mockContractCalls = {
  "facility-registration": {
    "register-facility": vi.fn(),
    "update-facility": vi.fn(),
    "get-facility": vi.fn(),
    "is-facility-owner": vi.fn(),
  },
}

// Mock blockchain state
let mockState = {
  facilities: new Map(),
  facilityOwners: new Map(),
  lastFacilityId: 0,
  blockHeight: 100,
}

// Reset state before each test
beforeEach(() => {
  mockState = {
    facilities: new Map(),
    facilityOwners: new Map(),
    lastFacilityId: 0,
    blockHeight: 100,
  }
  
  // Setup mock implementations
  mockContractCalls["facility-registration"]["register-facility"].mockImplementation(
      (name, address, squareFootage, facilityType, contactName, contactInfo) => {
        const newId = mockState.lastFacilityId + 1
        mockState.lastFacilityId = newId
        
        const facilityData = {
          name,
          address,
          squareFootage,
          facilityType,
          contactName,
          contactInfo,
          registrationDate: mockState.blockHeight,
        }
        
        mockState.facilities.set(newId, facilityData)
        mockState.facilityOwners.set(newId, { owner: "caller-principal" })
        
        return { isOk: true, value: newId }
      },
  )
  
  mockContractCalls["facility-registration"]["get-facility"].mockImplementation((facilityId) => {
    return mockState.facilities.get(facilityId) || null
  })
  
  mockContractCalls["facility-registration"]["is-facility-owner"].mockImplementation((facilityId, caller) => {
    const owner = mockState.facilityOwners.get(facilityId)
    return owner?.owner === caller
  })
  
  mockContractCalls["facility-registration"]["update-facility"].mockImplementation(
      (facilityId, name, address, squareFootage, facilityType, contactName, contactInfo) => {
        const facility = mockState.facilities.get(facilityId)
        const owner = mockState.facilityOwners.get(facilityId)
        
        if (!facility || !owner) {
          return { isOk: false, error: 404 }
        }
        
        if (owner.owner !== "caller-principal") {
          return { isOk: false, error: 403 }
        }
        
        const updatedFacility = {
          ...facility,
          name,
          address,
          squareFootage,
          facilityType,
          contactName,
          contactInfo,
        }
        
        mockState.facilities.set(facilityId, updatedFacility)
        return { isOk: true, value: true }
      },
  )
})

describe("Facility Registration Contract", () => {
  it("should register a new facility and return a facility ID", () => {
    const result = mockContractCalls["facility-registration"]["register-facility"](
        "Office Building",
        "123 Main St, Anytown, USA",
        5000,
        "commercial",
        "John Doe",
        "john@example.com",
    )
    
    expect(result.isOk).toBe(true)
    expect(result.value).toBe(1)
    expect(mockState.lastFacilityId).toBe(1)
    
    const facility = mockState.facilities.get(1)
    expect(facility).toBeDefined()
    expect(facility?.name).toBe("Office Building")
    expect(facility?.address).toBe("123 Main St, Anytown, USA")
    expect(facility?.squareFootage).toBe(5000)
  })
  
  it("should retrieve facility details", () => {
    // Register a facility first
    mockContractCalls["facility-registration"]["register-facility"](
        "Office Building",
        "123 Main St, Anytown, USA",
        5000,
        "commercial",
        "John Doe",
        "john@example.com",
    )
    
    const facility = mockContractCalls["facility-registration"]["get-facility"](1)
    
    expect(facility).toBeDefined()
    expect(facility?.name).toBe("Office Building")
    expect(facility?.address).toBe("123 Main St, Anytown, USA")
    expect(facility?.registrationDate).toBe(100)
  })
  
  it("should allow updating a facility by its owner", () => {
    // Register a facility first
    mockContractCalls["facility-registration"]["register-facility"](
        "Office Building",
        "123 Main St, Anytown, USA",
        5000,
        "commercial",
        "John Doe",
        "john@example.com",
    )
    
    const result = mockContractCalls["facility-registration"]["update-facility"](
        1,
        "Updated Office Building",
        "456 New St, Anytown, USA",
        6000,
        "commercial",
        "John Doe",
        "john@example.com",
    )
    
    expect(result.isOk).toBe(true)
    
    const facility = mockContractCalls["facility-registration"]["get-facility"](1)
    expect(facility?.name).toBe("Updated Office Building")
    expect(facility?.address).toBe("456 New St, Anytown, USA")
    expect(facility?.squareFootage).toBe(6000)
  })
  
  it("should verify facility ownership correctly", () => {
    // Register a facility first
    mockContractCalls["facility-registration"]["register-facility"](
        "Office Building",
        "123 Main St, Anytown, USA",
        5000,
        "commercial",
        "John Doe",
        "john@example.com",
    )
    
    const isOwner = mockContractCalls["facility-registration"]["is-facility-owner"](1, "caller-principal")
    const isNotOwner = mockContractCalls["facility-registration"]["is-facility-owner"](1, "different-principal")
    
    expect(isOwner).toBe(true)
    expect(isNotOwner).toBe(false)
  })
})
