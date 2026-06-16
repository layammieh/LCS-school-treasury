import * as React from "react"
import { X, AlertTriangle, LogOut } from "lucide-react"

export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  itemName?: string
  isProcessing?: boolean
  icon?: 'alert' | 'logout'
}

const ConfirmModal = React.forwardRef<HTMLDivElement, ConfirmModalProps>(
  ({ isOpen, onClose, onConfirm, title, message, itemName, isProcessing = false, icon = 'alert' }, ref) => {
    if (!isOpen) return null

    const iconStyles = {
      alert: "bg-red-50 text-red-500",
      logout: "bg-orange-50 text-orange-500"
    }

    const IconComponent = icon === 'logout' ? LogOut : AlertTriangle

    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div
          ref={ref}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-full flex-shrink-0 ${iconStyles[icon]}`}>
                <IconComponent className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">{title}</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {message}
                  {itemName && <span className="font-semibold text-gray-700"> "{itemName}"</span>}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              {isProcessing ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    )
  }
)
ConfirmModal.displayName = "ConfirmModal"

export { ConfirmModal }
