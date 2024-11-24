import React, { useEffect, useRef } from 'react';
import { Edit2, Trash2, ArrowRight } from 'lucide-react';

interface ClientContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (category: 'deposit' | 'building' | 'completed') => void;
  clientName: string;
  currentCategory: 'deposit' | 'building' | 'completed';
}

const categoryMoves = {
  deposit: [
    { to: 'building', label: 'Строим' },
    { to: 'completed', label: 'Построено' }
  ],
  building: [
    { to: 'deposit', label: 'Задаток' },
    { to: 'completed', label: 'Построено' }
  ],
  completed: [
    { to: 'deposit', label: 'Задаток' },
    { to: 'building', label: 'Строим' }
  ]
} as const;

export const ClientContextMenu: React.FC<ClientContextMenuProps> = ({
  position,
  onClose,
  onEdit,
  onDelete,
  onMove,
  clientName,
  currentCategory
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Вычисляем позицию меню с учетом границ экрана
  const menuStyle = (() => {
    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 50
    };

    if (position.x + 200 > window.innerWidth) {
      style.right = `${window.innerWidth - position.x}px`;
    } else {
      style.left = `${position.x}px`;
    }

    if (position.y + 300 > window.innerHeight) {
      style.bottom = `${window.innerHeight - position.y}px`;
    } else {
      style.top = `${position.y}px`;
    }

    return style;
  })();

  const availableMoves = categoryMoves[currentCategory];

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-lg py-2 min-w-[200px]"
      style={menuStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-2 text-sm font-medium text-gray-900 border-b border-gray-200">
        {clientName}
      </div>

      <div className="py-1">
        <button
          onClick={onEdit}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        >
          <Edit2 className="w-4 h-4" />
          Редактировать
        </button>
      </div>

      <div className="py-1 border-t border-gray-200">
        {availableMoves.map(({ to, label }) => (
          <button
            key={to}
            onClick={() => onMove(to)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Перевести в "{label}"
          </button>
        ))}
      </div>

      <div className="py-1 border-t border-gray-200">
        <button
          onClick={onDelete}
          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Удалить
        </button>
      </div>
    </div>
  );
};