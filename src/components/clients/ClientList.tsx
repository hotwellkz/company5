import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { Client } from '../../types/client';
import { doc, updateDoc, collection, addDoc, deleteDoc, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface IconContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  onToggleIcon: () => void;
  isHidden: boolean;
}

const IconContextMenu: React.FC<IconContextMenuProps> = ({
  position,
  onClose,
  onToggleIcon,
  isHidden
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

  const menuStyle = {
    position: 'fixed' as const,
    left: `${position.x}px`,
    top: `${position.y}px`,
    zIndex: 50
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-lg py-1 min-w-[180px]"
      style={menuStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onToggleIcon}
        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
      >
        {isHidden ? (
          <>
            <Eye className="w-4 h-4" />
            <span>Показать иконку</span>
          </>
        ) : (
          <>
            <EyeOff className="w-4 h-4" />
            <span>Скрыть иконку</span>
          </>
        )}
      </button>
    </div>
  );
};

interface ClientListProps {
  clients: Client[];
  onContextMenu: (e: React.MouseEvent, client: Client) => void;
  onClientClick: (client: Client) => void;
}

interface CategoryConfig {
  label: string;
  color: string;
  bgColor: string;
  hoverColor: string;
}

const categoryConfigs: Record<string, CategoryConfig> = {
  deposit: { 
    label: 'Задаток', 
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    hoverColor: 'hover:bg-amber-100/50'
  },
  building: { 
    label: 'Строим', 
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    hoverColor: 'hover:bg-emerald-100/50'
  },
  completed: { 
    label: 'Построено', 
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    hoverColor: 'hover:bg-blue-100/50'
  }
};

export const ClientList: React.FC<ClientListProps> = ({ 
  clients, 
  onContextMenu,
  onClientClick
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    deposit: true,
    building: true,
    completed: true
  });
  const [clientStates, setClientStates] = useState<Record<string, boolean>>({});
  const [iconContextMenu, setIconContextMenu] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    clientId: string;
  } | null>(null);

  // Подписываемся на изменения клиентов в Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const newStates: Record<string, boolean> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        newStates[doc.id] = data.hideProjectIcon || false;
      });
      setClientStates(newStates);
    });

    return () => unsubscribe();
  }, []);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleHideIconChange = async (client: Client) => {
    try {
      const clientRef = doc(db, 'clients', client.id);
      const newHideProjectIcon = !clientStates[client.id];

      // Оптимистично обновляем локальное состояние
      setClientStates(prev => ({
        ...prev,
        [client.id]: newHideProjectIcon
      }));

      // Обновляем статус скрытия иконки в Firebase
      await updateDoc(clientRef, {
        hideProjectIcon: newHideProjectIcon
      });

      // Обновляем категории проектов
      if (!newHideProjectIcon) {
        await addDoc(collection(db, 'categories'), {
          title: `${client.lastName} ${client.firstName}`,
          amount: '0 ₸',
          icon: 'Building2',
          color: 'bg-blue-500',
          row: 3
        });
      } else {
        const categoryQuery = query(
          collection(db, 'categories'),
          where('title', '==', `${client.lastName} ${client.firstName}`),
          where('row', '==', 3)
        );
        const categorySnapshot = await getDocs(categoryQuery);
        categorySnapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
      }

      setIconContextMenu(null);
    } catch (error) {
      // В случае ошибки возвращаем предыдущее состояние
      setClientStates(prev => ({
        ...prev,
        [client.id]: !clientStates[client.id]
      }));
      console.error('Error updating client:', error);
      alert('Ошибка при обновлении настроек клиента');
    }
  };

  const handleIconContextMenu = (e: React.MouseEvent, client: Client) => {
    e.preventDefault();
    e.stopPropagation();
    setIconContextMenu({
      visible: true,
      position: { x: e.clientX, y: e.clientY },
      clientId: client.id
    });
  };

  const clientsByCategory = clients.reduce((acc, client) => {
    const category = client.category || 'deposit';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(client);
    return acc;
  }, {} as Record<string, Client[]>);

  return (
    <div className="space-y-6" onClick={() => setIconContextMenu(null)}>
      {Object.entries(categoryConfigs).map(([category, config]) => {
        const categoryClients = clientsByCategory[category] || [];
        const isExpanded = expandedCategories[category];
        
        return (
          <div key={category} className={`rounded-lg shadow overflow-hidden ${config.bgColor}`}>
            <button
              onClick={() => toggleCategory(category)}
              className={`w-full flex items-center justify-between px-6 py-4 font-medium ${config.color} transition-colors`}
            >
              <span className="text-lg">{config.label} ({categoryClients.length})</span>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>

            {isExpanded && categoryClients.length > 0 && (
              <div className="divide-y divide-gray-200/50">
                {categoryClients.map((client, index) => (
                  <div
                    key={client.id}
                    className={`flex items-center px-6 py-4 ${config.hoverColor} cursor-pointer transition-colors`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onContextMenu(e, client);
                    }}
                    onClick={() => onClientClick(client)}
                  >
                    <span className="w-12 text-gray-500 font-medium">{index + 1}</span>
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {client.lastName} {client.firstName}
                        </span>
                        <span className="text-sm text-gray-500">
                          {client.clientNumber}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-gray-900">{client.phone}</span>
                        <div className="flex items-center space-x-2">
                          <button
                            className="flex items-center space-x-2 cursor-pointer px-3 py-1.5 rounded hover:bg-white/50 transition-colors"
                            onContextMenu={(e) => handleIconContextMenu(e, client)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleHideIconChange(client);
                            }}
                          >
                            {clientStates[client.id] ? (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            ) : (
                              <Eye className="w-4 h-4 text-emerald-500" />
                            )}
                            <span className="text-sm text-gray-600 select-none">
                              {clientStates[client.id] ? 'Иконка скрыта' : 'Иконка видна'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {iconContextMenu && iconContextMenu.visible && (
        <IconContextMenu
          position={iconContextMenu.position}
          onClose={() => setIconContextMenu(null)}
          onToggleIcon={() => {
            const client = clients.find(c => c.id === iconContextMenu.clientId);
            if (client) {
              handleHideIconChange(client);
            }
          }}
          isHidden={clientStates[iconContextMenu.clientId] || false}
        />
      )}
    </div>
  );
};