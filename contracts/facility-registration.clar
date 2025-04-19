;; Facility Registration Contract
;; Records details of serviced properties

(define-data-var last-facility-id uint u0)

(define-map facilities
  { facility-id: uint }
  {
    name: (string-utf8 100),
    address: (string-utf8 256),
    square-footage: uint,
    facility-type: (string-utf8 50),
    contact-name: (string-utf8 100),
    contact-info: (string-utf8 100),
    registration-date: uint
  }
)

(define-map facility-owners
  { facility-id: uint }
  { owner: principal }
)

;; Register a new facility
(define-public (register-facility
                 (name (string-utf8 100))
                 (address (string-utf8 256))
                 (square-footage uint)
                 (facility-type (string-utf8 50))
                 (contact-name (string-utf8 100))
                 (contact-info (string-utf8 100)))
  (let
    (
      (new-id (+ (var-get last-facility-id) u1))
    )
    (var-set last-facility-id new-id)
    (map-set facilities
      { facility-id: new-id }
      {
        name: name,
        address: address,
        square-footage: square-footage,
        facility-type: facility-type,
        contact-name: contact-name,
        contact-info: contact-info,
        registration-date: block-height
      }
    )
    (map-set facility-owners
      { facility-id: new-id }
      { owner: tx-sender }
    )
    (ok new-id)
  )
)

;; Update an existing facility's information
(define-public (update-facility
                 (facility-id uint)
                 (name (string-utf8 100))
                 (address (string-utf8 256))
                 (square-footage uint)
                 (facility-type (string-utf8 50))
                 (contact-name (string-utf8 100))
                 (contact-info (string-utf8 100)))
  (let
    (
      (owner-data (unwrap! (map-get? facility-owners { facility-id: facility-id }) (err u404)))
      (facility-data (unwrap! (map-get? facilities { facility-id: facility-id }) (err u404)))
    )
    ;; Fixed: Access owner from owner-data, not facility-data
    (asserts! (is-eq tx-sender (get owner owner-data)) (err u403))
    (map-set facilities
      { facility-id: facility-id }
      {
        name: name,
        address: address,
        square-footage: square-footage,
        facility-type: facility-type,
        contact-name: contact-name,
        contact-info: contact-info,
        registration-date: (get registration-date facility-data)
      }
    )
    (ok true)
  )
)

;; Get facility details
(define-read-only (get-facility (facility-id uint))
  (map-get? facilities { facility-id: facility-id })
)

;; Check if caller is facility owner
(define-read-only (is-facility-owner (facility-id uint) (caller principal))
  (let
    (
      (owner-data (unwrap! (map-get? facility-owners { facility-id: facility-id }) false))
    )
    (is-eq (get owner owner-data) caller)
  )
)
