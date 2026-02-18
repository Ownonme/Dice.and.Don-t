import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Expand, GripVertical } from 'lucide-react';
import { GlossaryEntry } from '@/types/glossary';
import { useNavigate } from 'react-router-dom';

interface SortableGlossaryEntryProps {
  entry: GlossaryEntry;
  isAdmin: boolean;
  onEdit: (entry: GlossaryEntry) => void;
  onDelete: (entry: GlossaryEntry) => void;
  onImageClick: (entry: GlossaryEntry) => void;
}

export default function SortableGlossaryEntry({ 
  entry, 
  isAdmin, 
  onEdit, 
  onDelete, 
  onImageClick 
}: SortableGlossaryEntryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const navigate = useNavigate();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={style}
      className={`cursor-pointer hover:bg-muted/50 transition-colors relative group ${
        isDragging ? 'shadow-lg' : ''
      }`}
      onClick={() => navigate(`/glossary/entry/${entry.id}`)}
    >
      {isAdmin && (
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      {isAdmin && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(entry);
            }}
            className="h-8 w-8 p-0"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry);
            }}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      <CardHeader>
        <CardTitle className="text-lg pr-20">{entry.term}</CardTitle>
      </CardHeader>
      <CardContent>
        {entry.image_url && (
          <div 
            className="relative mb-4 group cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(entry);
            }}
          >
            <img
              src={entry.image_url}
              alt={entry.term}
              className="w-full h-48 object-cover rounded-md"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-md flex items-center justify-center">
              <Expand className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        )}
        <p className="text-muted-foreground line-clamp-3">
          {entry.definition}
        </p>
        {entry.related_terms && entry.related_terms.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {entry.related_terms.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}