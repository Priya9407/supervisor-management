import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTheme } from '../context/ThemeContext'
import useWindowSize from '../hooks/useWindowSize'
import PageLayout from '../components/PageLayout'
import API from '../api/axios'
import toast from 'react-hot-toast'

const Stock = () => {
  const { colors } = useTheme()
  const { isMobile } = useWindowSize()

  const [stock, setStock]         = useState([])
  const [date, setDate]           = useState(
    new Date().toISOString().split('T')[0]
  )
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [activeTab, setActiveTab] = useState('morning')
  const [edits, setEdits]         = useState({})

  // Search & Filter states
  const [search, setSearch]         = useState('')
  const [filterSize, setFilterSize] = useState('ALL')
  const [filterType, setFilterType] = useState('ALL')
  const [filterNonZero, setFilterNonZero] = useState('ALL')
  // ALL, hasOB, hasReceived, hasSales

 const fetchStock = useCallback(async () => {
  try {
    setLoading(true)
    const res = await API.get(`/stock?date=${date}`)
    
    // ← Add safety check here
    const stockData = res.data?.stock || []
    setStock(stockData)
    
    const initialEdits = {}
    stockData.forEach(entry => {
      initialEdits[entry._id] = {
        casesReceived:   entry.casesReceived   || 0,
        bottlesReceived: entry.bottlesReceived || 0,
        salesBottles:    entry.salesBottles    || 0,
      }
    })
    setEdits(initialEdits)
  } catch (error) {
    toast.error('Failed to load stock')
    setStock([]) // ← Always set to empty array on error
  } finally {
    setLoading(false)
  }
}, [date])
  useEffect(() => { fetchStock() }, [fetchStock])

  const initializeStock = async () => {
    try {
      setSaving(true)
      await API.post('/stock/initialize')
      toast.success('Stock initialized!')
      fetchStock()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initialize')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (id, field, value) => {
    setEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: Number(value) || 0 }
    }))
  }

  const saveAll = async () => {
    try {
      setSaving(true)
      const updates = stock.map(entry => ({
        id: entry._id,
        casesReceived:   edits[entry._id]?.casesReceived   || 0,
        bottlesReceived: edits[entry._id]?.bottlesReceived || 0,
        salesBottles:    edits[entry._id]?.salesBottles    || 0,
      }))
      await API.put('/stock/bulk/update', {
        updates,
        type: activeTab === 'morning' ? 'receive' : 'sales'
      })
      toast.success('Saved successfully!')
      fetchStock()
    } catch (error) {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // ── Filtered & Searched Stock ──
  const filteredStock = useMemo(() => {
    return stock.filter(entry => {
      const product = entry.product

      // Search by name or govt code
      if (search.trim()) {
        const q = search.toLowerCase()
        const nameMatch = product?.name?.toLowerCase().includes(q)
        const codeMatch = product?.govtCode?.toLowerCase().includes(q)
        if (!nameMatch && !codeMatch) return false
      }

      // Filter by size
      if (filterSize !== 'ALL' && product?.size !== filterSize) return false

      // Filter by type
      if (filterType !== 'ALL' && product?.productType !== filterType) return false

      // Filter by non-zero values
      if (filterNonZero === 'hasOB' && entry.openingStock === 0) return false
      if (filterNonZero === 'hasReceived' && entry.totalReceived === 0) return false
      if (filterNonZero === 'hasSales' && entry.salesBottles === 0) return false
      if (filterNonZero === 'hasActivity' &&
        entry.openingStock === 0 &&
        entry.totalReceived === 0 &&
        entry.salesBottles === 0) return false

      return true
    })
  }, [stock, search, filterSize, filterType, filterNonZero])

  // Get unique sizes from stock
  const availableSizes = useMemo(() => {
    const sizes = [...new Set(stock.map(e => e.product?.size).filter(Boolean))]
    return sizes.sort()
  }, [stock])

  // Group filtered stock by size
  const grouped = useMemo(() => {
    return filteredStock.reduce((acc, entry) => {
      const size = entry.product?.size || 'Unknown'
      if (!acc[size]) acc[size] = []
      acc[size].push(entry)
      return acc
    }, {})
  }, [filteredStock])

  const sizeOrder = ['180ml', '375ml', '750ml', '1000ml', '650ml', '500ml']

  // Styles
  const inputStyle = {
    padding: '6px 8px',
    borderRadius: '6px',
    border: `1px solid ${colors.inputBorder}`,
    backgroundColor: colors.input,
    color: colors.text,
    fontSize: '13px',
    width: '80px',
    textAlign: 'center',
    outline: 'none',
  }

  const filterSelectStyle = {
    padding: '8px 10px',
    borderRadius: '8px',
    border: `1px solid ${colors.inputBorder}`,
    backgroundColor: colors.input,
    color: colors.text,
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
  }

  const statBadge = (label, value, color) => (
    <div style={{
      backgroundColor: color + '15',
      border: `1px solid ${color}30`,
      borderRadius: '8px',
      padding: '6px 12px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minWidth: '70px',
    }}>
      <span style={{
        fontSize: '16px',
        fontWeight: '700',
        color,
      }}>
        {value}
      </span>
      <span style={{
        fontSize: '10px',
        color: colors.textSub,
        marginTop: '2px',
      }}>
        {label}
      </span>
    </div>
  )

  if (loading) {
    return (
      <PageLayout title="📦 Stock Entry">
        <p style={{ color: colors.textSub }}>Loading stock...</p>
      </PageLayout>
    )
  }

  // Summary stats
  const totalOB       = stock.reduce((s, e) => s + e.openingStock, 0)
  const totalReceived = stock.reduce((s, e) => s + e.totalReceived, 0)
  const totalSales    = stock.reduce((s, e) => s + e.salesBottles, 0)
  const totalClosing  = stock.reduce((s, e) => s + e.cbbo, 0)

  return (
    <PageLayout title="📦 Stock Entry">

      {/* ── Top Controls ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
      }}>
        {/* Date Picker */}
        <input
          type="date"
          value={date}
          max={new Date().toISOString().split('T')[0]}
          onChange={e => setDate(e.target.value)}
          style={filterSelectStyle}
        />

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Initialize button */}
          {stock.length === 0 && (
            <button
              onClick={initializeStock}
              disabled={saving}
              style={{
                padding: '8px 20px',
                backgroundColor: colors.success,
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {saving ? 'Initializing...' : '🚀 Initialize Stock'}
            </button>
          )}

          {/* Save All */}
          {stock.length > 0 && (
            <button
              onClick={saveAll}
              disabled={saving}
              style={{
                padding: '8px 24px',
                backgroundColor: saving ? colors.textSub : colors.accent,
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : '💾 Save All'}
            </button>
          )}
        </div>
      </div>

      {/* ── Summary Stats ── */}
      {stock.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '16px',
        }}>
          {statBadge('Opening', totalOB, colors.info)}
          {statBadge('Received', totalReceived, colors.success)}
          {statBadge('Sales', totalSales, colors.warning)}
          {statBadge('Closing', totalClosing, colors.accent)}
          {statBadge('Showing', filteredStock.length, colors.textSub)}
        </div>
      )}

      {/* ── Morning / Night Tabs ── */}
      {stock.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '0',
          marginBottom: '16px',
          borderBottom: `2px solid ${colors.border}`,
        }}>
          {[
            { key: 'morning', label: '🌅 Morning (Received)' },
            { key: 'night',   label: '🌙 Night (Sales)'      },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: isMobile ? '10px 14px' : '12px 24px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.key
                  ? `2px solid ${colors.accent}`
                  : '2px solid transparent',
                color: activeTab === tab.key
                  ? colors.accent : colors.textSub,
                fontSize: isMobile ? '12px' : '14px',
                fontWeight: activeTab === tab.key ? '600' : '400',
                cursor: 'pointer',
                marginBottom: '-2px',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Search & Filters ── */}
      {stock.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '20px',
          padding: '14px',
          backgroundColor: colors.card,
          borderRadius: '10px',
          border: `1px solid ${colors.border}`,
        }}>

          {/* Search */}
          <div style={{
            flex: 1,
            minWidth: '200px',
            position: 'relative',
          }}>
            <span style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.textSub,
              fontSize: '14px',
            }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by brand name or govt code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                ...filterSelectStyle,
                width: '100%',
                paddingLeft: '32px',
              }}
            />
          </div>

          {/* Size Filter */}
          <select
            value={filterSize}
            onChange={e => setFilterSize(e.target.value)}
            style={filterSelectStyle}
          >
            <option value="ALL">All Sizes</option>
            {availableSizes.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={filterSelectStyle}
          >
            <option value="ALL">All Types</option>
            <option value="IMFL">IMFL</option>
            <option value="BEER">Beer</option>
          </select>

          {/* Non-Zero Filter */}
          <select
            value={filterNonZero}
            onChange={e => setFilterNonZero(e.target.value)}
            style={filterSelectStyle}
          >
            <option value="ALL">All Products</option>
            <option value="hasOB">Has Opening Stock</option>
            <option value="hasReceived">Received Today</option>
            <option value="hasSales">Has Sales</option>
            <option value="hasActivity">Has Any Activity</option>
          </select>

          {/* Clear Filters */}
          {(search || filterSize !== 'ALL' ||
            filterType !== 'ALL' || filterNonZero !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('')
                setFilterSize('ALL')
                setFilterType('ALL')
                setFilterNonZero('ALL')
              }}
              style={{
                padding: '8px 14px',
                backgroundColor: colors.danger + '15',
                color: colors.danger,
                border: `1px solid ${colors.danger}30`,
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      )}

      {/* ── No Results ── */}
      {stock.length > 0 && filteredStock.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: colors.textSub,
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
          <p style={{ color: colors.text, fontSize: '15px' }}>
            No products match your search
          </p>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>
            Try a different name, code or filter
          </p>
        </div>
      )}

      {/* ── No Stock ── */}
      {stock.length === 0 && (
  <div style={{
    textAlign: 'center',
    padding: '60px 20px',
    color: colors.textSub,
  }}>
    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
    <p style={{
      fontSize: '16px',
      color: colors.text,
      marginBottom: '8px',
    }}>
      No stock entry for this date
    </p>
    {date === new Date().toISOString().split('T')[0] ? (
      <div>
        <p style={{ fontSize: '13px', marginBottom: '16px' }}>
          Make sure you have added products first, then initialize stock
        </p>
        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => window.location.href = '/inventory'}
            style={{
              padding: '10px 20px',
              backgroundColor: colors.info,
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Go Add Products First
          </button>
        </div>
      </div>
    ) : (
      <p style={{ fontSize: '13px' }}>
        No data found for selected date
      </p>
    )}
  </div>
)}

      {/* ── Stock Table Grouped by Size ── */}
      {Object.entries(grouped)
        .sort(([a], [b]) => {
          const ai = sizeOrder.indexOf(a)
          const bi = sizeOrder.indexOf(b)
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        })
        .map(([size, entries]) => (
          <div key={size} style={{ marginBottom: '28px' }}>

            {/* Size Header */}
            <div style={{
              fontSize: '15px',
              fontWeight: '700',
              color: colors.accent,
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: `2px solid ${colors.accent}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              🍾 {size}
              <span style={{
                fontSize: '12px',
                color: colors.textSub,
                fontWeight: '400',
              }}>
                ({entries.length} products)
              </span>
            </div>

            {/* Mobile Cards */}
            {isMobile ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                {entries.map(entry => {
                  const casesRec  = edits[entry._id]?.casesReceived   || 0
                  const btlsRec   = edits[entry._id]?.bottlesReceived || 0
                  const salesBtl  = edits[entry._id]?.salesBottles    || 0
                  const totalRec  = casesRec *
                    (entry.product?.bottlesPerCase || 0) + btlsRec
                  const totalAvail = entry.openingStock + totalRec
                  const cbbo = entry.totalAvailable - salesBtl
                  const closingCases = Math.floor(
                    cbbo / (entry.product?.bottlesPerCase || 1)
                  )
                  const closingBtls = cbbo %
                    (entry.product?.bottlesPerCase || 1)

                  return (
                    <div
                      key={entry._id}
                      style={{
                        backgroundColor: colors.card,
                        borderRadius: '10px',
                        border: `1px solid ${colors.border}`,
                        padding: '14px',
                      }}
                    >
                      {/* Header */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '12px',
                      }}>
                        <div>
                          <div style={{
                            fontWeight: '600',
                            color: colors.text,
                            fontSize: '14px',
                          }}>
                            {entry.product?.name}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: colors.textSub,
                            marginTop: '3px',
                            display: 'flex',
                            gap: '8px',
                          }}>
                            <span style={{
                              backgroundColor: colors.accent + '20',
                              color: colors.accent,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontFamily: 'monospace',
                            }}>
                              {entry.product?.govtCode}
                            </span>
                            <span>{entry.product?.priceCategory}</span>
                          </div>
                        </div>
                        <div style={{
                          textAlign: 'right',
                          fontSize: '12px',
                          color: colors.textSub,
                        }}>
                          <div>OB: <strong style={{
                            color: colors.info,
                          }}>
                            {entry.openingStock}
                          </strong></div>
                          <div>Rate: ₹{entry.product?.price}</div>
                        </div>
                      </div>

                      {/* Morning Entry */}
                      {activeTab === 'morning' && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '10px',
                        }}>
                          <div>
                            <div style={{
                              fontSize: '11px',
                              color: colors.textSub,
                              marginBottom: '4px',
                            }}>
                              Cases Received
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={casesRec}
                              onChange={e => handleEdit(
                                entry._id, 'casesReceived', e.target.value
                              )}
                              style={{
                                ...inputStyle,
                                width: '100%',
                              }}
                            />
                          </div>
                          <div>
                            <div style={{
                              fontSize: '11px',
                              color: colors.textSub,
                              marginBottom: '4px',
                            }}>
                              Loose Bottles
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={btlsRec}
                              onChange={e => handleEdit(
                                entry._id, 'bottlesReceived', e.target.value
                              )}
                              style={{
                                ...inputStyle,
                                width: '100%',
                              }}
                            />
                          </div>
                          <div style={{
                            gridColumn: '1 / -1',
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            backgroundColor: colors.bg,
                            borderRadius: '6px',
                            fontSize: '13px',
                          }}>
                            <span style={{ color: colors.textSub }}>
                              Total Received:
                              <strong style={{ color: colors.success, marginLeft: '6px' }}>
                                {totalRec}
                              </strong>
                            </span>
                            <span style={{ color: colors.textSub }}>
                              Available:
                              <strong style={{ color: colors.info, marginLeft: '6px' }}>
                                {totalAvail}
                              </strong>
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Night Entry */}
                      {activeTab === 'night' && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '10px',
                        }}>
                          <div style={{
                            padding: '8px 12px',
                            backgroundColor: colors.bg,
                            borderRadius: '6px',
                            fontSize: '13px',
                          }}>
                            <div style={{
                              fontSize: '11px',
                              color: colors.textSub,
                              marginBottom: '2px',
                            }}>
                              Available
                            </div>
                            <strong style={{ color: colors.text }}>
                              {entry.totalAvailable}
                            </strong>
                          </div>
                          <div>
                            <div style={{
                              fontSize: '11px',
                              color: colors.textSub,
                              marginBottom: '4px',
                            }}>
                              Bottles Sold
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={salesBtl}
                              onChange={e => handleEdit(
                                entry._id, 'salesBottles', e.target.value
                              )}
                              style={{
                                ...inputStyle,
                                width: '100%',
                              }}
                            />
                          </div>
                          <div style={{
                            gridColumn: '1 / -1',
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            backgroundColor: colors.bg,
                            borderRadius: '6px',
                            fontSize: '13px',
                          }}>
                            <span style={{ color: colors.textSub }}>
                              CBBO:
                              <strong style={{
                                color: colors.warning,
                                marginLeft: '6px',
                              }}>
                                {cbbo}
                              </strong>
                            </span>
                            <span style={{ color: colors.textSub }}>
                              C:{closingCases} B:{closingBtls}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              // Desktop Table
              <div style={{
                backgroundColor: colors.card,
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                overflowX: 'auto',
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '13px',
                  minWidth: '700px',
                }}>
                  <thead>
                    <tr style={{
                      backgroundColor: colors.bg,
                      borderBottom: `1px solid ${colors.border}`,
                    }}>
                      {(activeTab === 'morning'
                        ? ['Code', 'Brand', 'Cat', 'OB',
                            'Cases Recd', 'Loose Btls',
                            'Total Recd', 'Total Avail']
                        : ['Code', 'Brand', 'Cat', 'OB',
                            'Total Avail', 'Sales Btls',
                            'CBBO', 'C', 'B', 'Rate', 'Sales Val']
                      ).map(h => (
                        <th key={h} style={{
                          padding: '10px 12px',
                          textAlign: ['Code', 'Brand', 'Cat'].includes(h)
                            ? 'left' : 'center',
                          color: colors.textSub,
                          fontWeight: '600',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                          whiteSpace: 'nowrap',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => {
                      const casesRec  = edits[entry._id]?.casesReceived   || 0
                      const btlsRec   = edits[entry._id]?.bottlesReceived || 0
                      const salesBtl  = edits[entry._id]?.salesBottles    || 0
                      const bpc       = entry.product?.bottlesPerCase || 1
                      const price     = entry.product?.price || 0
                      const totalRec  = casesRec * bpc + btlsRec
                      const totalAvail = entry.openingStock + totalRec
                      const cbbo      = entry.totalAvailable - salesBtl
                      const cCases    = Math.floor(cbbo / bpc)
                      const cBtls     = cbbo % bpc
                      const salesVal  = salesBtl * price

                      return (
                        <tr
                          key={entry._id}
                          style={{
                            borderBottom: idx < entries.length - 1
                              ? `1px solid ${colors.border}` : 'none',
                            backgroundColor: idx % 2 === 0
                              ? 'transparent' : colors.bg + '40',
                          }}
                        >
                          <td style={{
                            padding: '9px 12px',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                          }}>
                            <span style={{
                              backgroundColor: colors.accent + '15',
                              color: colors.accent,
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}>
                              {entry.product?.govtCode}
                            </span>
                          </td>
                          <td style={{
                            padding: '9px 12px',
                            color: colors.text,
                            fontWeight: '500',
                            whiteSpace: 'nowrap',
                          }}>
                            {entry.product?.name}
                          </td>
                          <td style={{
                            padding: '9px 12px',
                            color: colors.textSub,
                            fontSize: '12px',
                          }}>
                            {entry.product?.priceCategory}
                          </td>
                          <td style={{
                            padding: '9px 12px',
                            color: colors.info,
                            fontWeight: '600',
                            textAlign: 'center',
                          }}>
                            {entry.openingStock}
                          </td>

                          {activeTab === 'morning' ? <>
                            <td style={{
                              padding: '9px 12px',
                              textAlign: 'center',
                            }}>
                              <input
                                type="number"
                                min="0"
                                value={casesRec}
                                onChange={e => handleEdit(
                                  entry._id, 'casesReceived', e.target.value
                                )}
                                style={inputStyle}
                              />
                            </td>
                            <td style={{
                              padding: '9px 12px',
                              textAlign: 'center',
                            }}>
                              <input
                                type="number"
                                min="0"
                                value={btlsRec}
                                onChange={e => handleEdit(
                                  entry._id, 'bottlesReceived', e.target.value
                                )}
                                style={inputStyle}
                              />
                            </td>
                            <td style={{
                              padding: '9px 12px',
                              color: colors.success,
                              fontWeight: '700',
                              textAlign: 'center',
                            }}>
                              {totalRec}
                            </td>
                            <td style={{
                              padding: '9px 12px',
                              color: colors.info,
                              fontWeight: '700',
                              textAlign: 'center',
                            }}>
                              {totalAvail}
                            </td>
                          </> : <>
                            <td style={{
                              padding: '9px 12px',
                              color: colors.text,
                              fontWeight: '500',
                              textAlign: 'center',
                            }}>
                              {entry.totalAvailable}
                            </td>
                            <td style={{
                              padding: '9px 12px',
                              textAlign: 'center',
                            }}>
                              <input
                                type="number"
                                min="0"
                                value={salesBtl}
                                onChange={e => handleEdit(
                                  entry._id, 'salesBottles', e.target.value
                                )}
                                style={inputStyle}
                              />
                            </td>
                            <td style={{
                              padding: '9px 12px',
                              color: colors.warning,
                              fontWeight: '700',
                              textAlign: 'center',
                            }}>
                              {cbbo}
                            </td>
                            <td style={{
                              padding: '9px 12px',
                              color: colors.textSub,
                              textAlign: 'center',
                            }}>
                              {cCases}
                            </td>
                            <td style={{
                              padding: '9px 12px',
                              color: colors.textSub,
                              textAlign: 'center',
                            }}>
                              {cBtls}
                            </td>
                            <td style={{
                              padding: '9px 12px',
                              color: colors.textSub,
                              textAlign: 'center',
                              fontSize: '12px',
                            }}>
                              ₹{price}
                            </td>
                            <td style={{
                              padding: '9px 12px',
                              color: colors.success,
                              fontWeight: '600',
                              textAlign: 'center',
                            }}>
                              ₹{salesVal.toLocaleString('en-IN')}
                            </td>
                          </>}
                        </tr>
                      )
                    })}
                  </tbody>

                  {/* Total Row */}
                  {entries.length > 1 && (
                    <tfoot>
                      <tr style={{
                        backgroundColor: colors.accent + '10',
                        borderTop: `2px solid ${colors.accent}`,
                      }}>
                        <td colSpan={3} style={{
                          padding: '10px 12px',
                          fontWeight: '700',
                          color: colors.accent,
                          fontSize: '12px',
                        }}>
                          SUBTOTAL
                        </td>
                        <td style={{
                          padding: '10px 12px',
                          fontWeight: '700',
                          color: colors.info,
                          textAlign: 'center',
                        }}>
                          {entries.reduce((s, e) => s + e.openingStock, 0)}
                        </td>
                        {activeTab === 'morning' ? <>
                          <td />
                          <td />
                          <td style={{
                            padding: '10px 12px',
                            fontWeight: '700',
                            color: colors.success,
                            textAlign: 'center',
                          }}>
                            {entries.reduce((s, e) => {
                              const c = edits[e._id]?.casesReceived || 0
                              const b = edits[e._id]?.bottlesReceived || 0
                              return s + c * (e.product?.bottlesPerCase || 0) + b
                            }, 0)}
                          </td>
                          <td style={{
                            padding: '10px 12px',
                            fontWeight: '700',
                            color: colors.info,
                            textAlign: 'center',
                          }}>
                            {entries.reduce((s, e) => {
                              const c = edits[e._id]?.casesReceived || 0
                              const b = edits[e._id]?.bottlesReceived || 0
                              return s + e.openingStock +
                                c * (e.product?.bottlesPerCase || 0) + b
                            }, 0)}
                          </td>
                        </> : <>
                          <td style={{
                            padding: '10px 12px',
                            fontWeight: '700',
                            color: colors.text,
                            textAlign: 'center',
                          }}>
                            {entries.reduce((s, e) => s + e.totalAvailable, 0)}
                          </td>
                          <td />
                          <td style={{
                            padding: '10px 12px',
                            fontWeight: '700',
                            color: colors.warning,
                            textAlign: 'center',
                          }}>
                            {entries.reduce((s, e) => {
                              const sales = edits[e._id]?.salesBottles || 0
                              return s + (e.totalAvailable - sales)
                            }, 0)}
                          </td>
                          <td colSpan={2} />
                          <td />
                          <td style={{
                            padding: '10px 12px',
                            fontWeight: '700',
                            color: colors.success,
                            textAlign: 'center',
                          }}>
                            ₹{entries.reduce((s, e) => {
                              const sales = edits[e._id]?.salesBottles || 0
                              return s + sales * (e.product?.price || 0)
                            }, 0).toLocaleString('en-IN')}
                          </td>
                        </>}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        ))}

    </PageLayout>
  )
}

export default Stock
