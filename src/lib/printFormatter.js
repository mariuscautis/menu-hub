// ESC/POS ticket formatter for Star thermal printers (StarPRNT dialect)
// Returns a Uint8Array of raw printer commands.

const ESC = 0x1b
const GS  = 0x1d
const LF  = 0x0a

// Helpers
function text(str) {
  return new TextEncoder().encode(str)
}

function line(str = '') {
  return text(str + '\n')
}

function divider(char = '-', width = 32) {
  return line(char.repeat(width))
}

// ESC/POS commands
const INIT          = new Uint8Array([ESC, 0x40])                    // Initialize printer
const BOLD_ON       = new Uint8Array([ESC, 0x45, 0x01])
const BOLD_OFF      = new Uint8Array([ESC, 0x45, 0x00])
const ALIGN_LEFT    = new Uint8Array([ESC, 0x61, 0x00])
const ALIGN_CENTER  = new Uint8Array([ESC, 0x61, 0x01])
const SIZE_LARGE    = new Uint8Array([GS,  0x21, 0x11])              // Double width + height
const SIZE_NORMAL   = new Uint8Array([GS,  0x21, 0x00])
const CUT           = new Uint8Array([GS,  0x56, 0x41, 0x10])        // Partial cut with feed

function concat(...arrays) {
  const total = arrays.reduce((n, a) => n + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) {
    out.set(a, offset)
    offset += a.length
  }
  return out
}

function pad(left, right, width = 32) {
  const space = Math.max(1, width - left.length - right.length)
  return left + ' '.repeat(space) + right
}

function formatTime(isoString) {
  const d = new Date(isoString)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDate(isoString) {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Build a StarPRNT ticket for a kitchen/bar printer.
 *
 * @param {object} params
 * @param {object} params.order        - Full order row including tables and order_items
 * @param {array}  params.items        - order_items already filtered to this department
 * @param {string} params.department   - 'kitchen' | 'bar' | etc.
 * @param {string} params.printerName  - Human label, e.g. "Kitchen Printer"
 * @returns {Uint8Array}
 */
export function buildStarPRNT({ order, items, department, printerName }) {
  const WIDTH = 32

  const deptLabel = department.toUpperCase()
  const tableNum  = order.tables?.table_number
  const orderType = order.order_type === 'takeaway' ? 'TAKEAWAY' : tableNum ? `TABLE ${tableNum}` : 'DINE-IN'
  const orderId   = String(order.id).slice(0, 8).toUpperCase()
  const timeStr   = formatTime(order.created_at)
  const dateStr   = formatDate(order.created_at)

  const chunks = [
    INIT,
    ALIGN_CENTER,
    SIZE_LARGE,
    BOLD_ON,
    line(deptLabel),
    SIZE_NORMAL,
    BOLD_OFF,
    line(''),
    BOLD_ON,
    line(orderType),
    BOLD_OFF,
    line(`#${orderId}`),
    line(`${dateStr}  ${timeStr}`),
    ALIGN_LEFT,
    divider('-', WIDTH),
  ]

  // Items
  for (const item of items) {
    const qty  = String(item.quantity)
    const name = item.name || 'Item'

    // Quantity + name on one line, bold
    chunks.push(BOLD_ON)
    chunks.push(line(pad(`${qty}x  ${name}`, '', WIDTH)))
    chunks.push(BOLD_OFF)

    // Special instructions indented below the item
    if (item.special_instructions) {
      const note = item.special_instructions.trim()
      // Word-wrap at WIDTH-4 to leave an indent margin
      const maxW = WIDTH - 4
      const words = note.split(' ')
      let currentLine = '  > '
      for (const word of words) {
        if ((currentLine + word).length > maxW + 4) {
          chunks.push(line(currentLine))
          currentLine = '    ' + word + ' '
        } else {
          currentLine += word + ' '
        }
      }
      if (currentLine.trim().length > 0) chunks.push(line(currentLine.trimEnd()))
    }
  }

  chunks.push(divider('-', WIDTH))

  // Order-level notes
  if (order.notes) {
    chunks.push(BOLD_ON)
    chunks.push(line('NOTE:'))
    chunks.push(BOLD_OFF)
    chunks.push(line(order.notes))
    chunks.push(divider('-', WIDTH))
  }

  // Customer name for takeaway
  if (order.order_type === 'takeaway' && order.customer_name) {
    chunks.push(line(`Customer: ${order.customer_name}`))
    chunks.push(divider('-', WIDTH))
  }

  // Feed and cut
  chunks.push(new Uint8Array([LF, LF, LF]))
  chunks.push(CUT)

  return concat(...chunks)
}
