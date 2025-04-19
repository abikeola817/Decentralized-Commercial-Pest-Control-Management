;; Technician Verification Contract
;; Validates qualified pest control providers

(define-data-var last-technician-id uint u0)
(define-data-var admin principal tx-sender)

(define-map technicians
  { technician-id: uint }
  {
    name: (string-utf8 100),
    license-number: (string-utf8 50),
    certification-date: uint,
    certification-expiry: uint,
    specializations: (list 5 (string-utf8 50)),
    active: bool
  }
)

(define-map technician-accounts
  { technician-id: uint }
  { account: principal }
)

(define-map account-to-technician
  { account: principal }
  { technician-id: uint }
)

;; Get the current admin
(define-read-only (get-admin)
  (var-get admin)
)

;; Set the admin
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Register a new technician
(define-public (register-technician
                 (name (string-utf8 100))
                 (license-number (string-utf8 50))
                 (certification-expiry uint)
                 (specializations (list 5 (string-utf8 50)))
                 (technician-account principal))
  (let
    (
      (new-id (+ (var-get last-technician-id) u1))
    )
    ;; Only admin can register technicians
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))

    (var-set last-technician-id new-id)
    (map-set technicians
      { technician-id: new-id }
      {
        name: name,
        license-number: license-number,
        certification-date: block-height,
        certification-expiry: certification-expiry,
        specializations: specializations,
        active: true
      }
    )
    (map-set technician-accounts
      { technician-id: new-id }
      { account: technician-account }
    )
    (map-set account-to-technician
      { account: technician-account }
      { technician-id: new-id }
    )
    (ok new-id)
  )
)

;; Update technician status (active/inactive)
(define-public (update-technician-status (technician-id uint) (active bool))
  (let
    (
      (tech-data (unwrap! (map-get? technicians { technician-id: technician-id }) (err u404)))
    )
    ;; Only admin can update status
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))

    (map-set technicians
      { technician-id: technician-id }
      (merge tech-data { active: active })
    )
    (ok true)
  )
)

;; Renew technician certification
(define-public (renew-certification (technician-id uint) (new-expiry uint))
  (let
    (
      (tech-data (unwrap! (map-get? technicians { technician-id: technician-id }) (err u404)))
    )
    ;; Only admin can renew certifications
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    ;; Ensure new expiry is in the future
    (asserts! (> new-expiry block-height) (err u400))

    (map-set technicians
      { technician-id: technician-id }
      (merge tech-data { certification-expiry: new-expiry })
    )
    (ok true)
  )
)

;; Check if a technician is verified and active
(define-read-only (is-verified-technician (technician-id uint) (caller principal))
  (let
    (
      (tech-data (unwrap! (map-get? technicians { technician-id: technician-id }) false))
      (account-data (unwrap! (map-get? technician-accounts { technician-id: technician-id }) false))
    )
    (and
      (get active tech-data)
      (> (get certification-expiry tech-data) block-height)
      (is-eq (get account account-data) caller)
    )
  )
)

;; Get technician details
(define-read-only (get-technician (technician-id uint))
  (map-get? technicians { technician-id: technician-id })
)

;; Get technician ID from account
(define-read-only (get-technician-by-account (account principal))
  (map-get? account-to-technician { account: account })
)
