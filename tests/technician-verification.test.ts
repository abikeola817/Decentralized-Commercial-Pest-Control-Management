import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock contract-call responses
const mockContractCalls = {
  "technician-verification": {
    "register-technician": vi.fn(),
    "update-technician-status": vi.fn(),
    "renew-certification": vi.fn(),
    "is-verified-technician": vi.fn(),
    "get-technician": vi.fn(),
    "get-technician-by-account": vi.fn(),
  },
  "compliance-tracking": {
    "get-admin": vi.fn(),
  },
}

// Mock blockchain state
let mockState = {
  technicians: new Map(),
  technicianAccounts: new Map(),
  accountToTechnician: new Map(),
  lastTechnicianId: 0,
  blockHeight: 500,
  admin: "admin-principal",
}

// Reset state before each test
beforeEach(() => {
  mockState = {
    technicians: new Map(),
    technicianAccounts: new Map(),
    accountToTechnician: new Map(),
    lastTechnicianId: 0,
    blockHeight: 500,
    admin: "admin-principal",
  }
  
  // Setup mock implementations
  mockContractCalls["compliance-tracking"]["get-admin"].mockReturnValue(mockState.admin)
  
  mockContractCalls["technician-verification"]["register-technician"].mockImplementation(
      (name, licenseNumber, certificationExpiry, specializations, technicianAccount) => {
        const newId = mockState.lastTechnicianId + 1
        mockState.lastTechnicianId = newId
        
        const technicianData = {
          name,
          licenseNumber,
          certificationDate: mockState.blockHeight,
          certificationExpiry,
          specializations,
          active: true,
        }
        
        mockState.technicians.set(newId, technicianData)
        mockState.technicianAccounts.set(newId, { account: technicianAccount })
        mockState.accountToTechnician.set(technicianAccount, { technicianId: newId })
        
        return { isOk: true, value: newId }
      },
  )
  
  mockContractCalls["technician-verification"]["get-technician"].mockImplementation((technicianId) => {
    return mockState.technicians.get(technicianId) || null
  })
  
  mockContractCalls["technician-verification"]["update-technician-status"].mockImplementation(
      (technicianId, active) => {
        const technician = mockState.technicians.get(technicianId)
        
        if (!technician) {
          return { isOk: false, error: 404 }
        }
        
        technician.active = active
        mockState.technicians.set(technicianId, technician)
        
        return { isOk: true, value: true }
      },
  )
  
  mockContractCalls["technician-verification"]["is-verified-technician"].mockImplementation((technicianId, caller) => {
    const technician = mockState.technicians.get(technicianId)
    const account = mockState.technicianAccounts.get(technicianId)
    
    if (!technician || !account) {
      return false
    }
    
    return technician.active && technician.certificationExpiry > mockState.blockHeight && account.account === caller
  })
})

describe("Technician Verification Contract", () => {
  it("should register a new technician and return a technician ID", () => {
    const result = mockContractCalls["technician-verification"]["register-technician"](
        "Jane Smith",
        "PCO-12345",
        1000, // Expiry block height
        ["general", "rodent", "termite"],
        "tech-principal",
    )
    
    expect(result.isOk).toBe(true)
    expect(result.value).toBe(1)
    expect(mockState.lastTechnicianId).toBe(1)
    
    const technician = mockState.technicians.get(1)
    expect(technician).toBeDefined()
    expect(technician?.name).toBe("Jane Smith")
    expect(technician?.licenseNumber).toBe("PCO-12345")
    expect(technician?.active).toBe(true)
  })
  
  it("should retrieve technician details", () => {
    // Register a technician first
    mockContractCalls["technician-verification"]["register-technician"](
        "Jane Smith",
        "PCO-12345",
        1000,
        ["general", "rodent", "termite"],
        "tech-principal",
    )
    
    const technician = mockContractCalls["technician-verification"]["get-technician"](1)
    
    expect(technician).toBeDefined()
    expect(technician?.name).toBe("Jane Smith")
    expect(technician?.licenseNumber).toBe("PCO-12345")
    expect(technician?.certificationDate).toBe(500)
  })
  
  it("should update a technician status", () => {
    // Register a technician first
    mockContractCalls["technician-verification"]["register-technician"](
        "Jane Smith",
        "PCO-12345",
        1000,
        ["general", "rodent", "termite"],
        "tech-principal",
    )
    
    // Update status to inactive
    const result = mockContractCalls["technician-verification"]["update-technician-status"](1, false)
    expect(result.isOk).toBe(true)
    
    const technician = mockState.technicians.get(1)
    expect(technician?.active).toBe(false)
  })
  
  it("should verify a technician correctly", () => {
    // Register a technician
    mockContractCalls["technician-verification"]["register-technician"](
        "Jane Smith",
        "PCO-12345",
        1000, // Expiry in the future
        ["general", "rodent", "termite"],
        "tech-principal",
    )
    
    // Valid technician with correct account
    const isVerified = mockContractCalls["technician-verification"]["is-verified-technician"](1, "tech-principal")
    expect(isVerified).toBe(true)
    
    // Wrong account
    const wrongAccount = mockContractCalls["technician-verification"]["is-verified-technician"](1, "wrong-principal")
    expect(wrongAccount).toBe(false)
    
    // Deactivated technician
    mockContractCalls["technician-verification"]["update-technician-status"](1, false)
    const deactivated = mockContractCalls["technician-verification"]["is-verified-technician"](1, "tech-principal")
    expect(deactivated).toBe(false)
  })
})
