import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Chat } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, MessageSquare, Menu, X, MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getAvailableModels } from "@/lib/models";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ChatSidebarProps {
  selectedChatId: number;
  onSelectChat: (chatId: number) => void;
}

export function ChatSidebar({ selectedChatId, onSelectChat }: ChatSidebarProps) {
  const [newChatTitle, setNewChatTitle] = useState("");
  const [newChatModel, setNewChatModel] = useState("gpt-4o-mini");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [chatToRename, setChatToRename] = useState<Chat | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const models = getAvailableModels();

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: chats = [] } = useQuery<Chat[]>({
    queryKey: ["/api/chats"],
  });

  const createChatMutation = useMutation({
    mutationFn: async ({ title, model }: { title: string; model: string }) => {
      const res = await apiRequest("POST", "/api/chats", { title, model });
      return res.json();
    },
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setNewChatTitle("");
      onSelectChat(newChat.id);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive"
      });
    }
  });

  const renameChatMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      const res = await apiRequest("PATCH", `/api/chats/${id}`, { title });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setRenameDialogOpen(false);
      setChatToRename(null);
      setNewTitle("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to rename chat",
        variant: "destructive"
      });
    }
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/chats/${id}`);
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      if (selectedChatId === deletedId) {
        const remainingChat = chats.find(chat => chat.id !== deletedId);
        if (remainingChat) {
          onSelectChat(remainingChat.id);
        }
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive"
      });
    }
  });

  const handleCreateChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChatTitle.trim() && !createChatMutation.isPending) {
      createChatMutation.mutate({ title: newChatTitle, model: newChatModel });
    }
  };

  const handleRenameClick = (chat: Chat) => {
    setChatToRename(chat);
    setNewTitle(chat.title);
    setRenameDialogOpen(true);
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatToRename && newTitle.trim() && !renameChatMutation.isPending) {
      renameChatMutation.mutate({ id: chatToRename.id, title: newTitle });
    }
  };

  return (
    <div className={cn(
      "border-r bg-muted/50 flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="flex justify-end p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8"
        >
          {isCollapsed ? (
            <Menu className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </div>

      {!isCollapsed && (
        <form onSubmit={handleCreateChat} className="p-4 space-y-2">
          <Input
            value={newChatTitle}
            onChange={(e) => setNewChatTitle(e.target.value)}
            placeholder="New Chat Title"
          />
          <Select value={newChatModel} onValueChange={setNewChatModel}>
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <span className="font-medium">{model.name}</span>
                  <span className="ml-2 text-muted-foreground">({model.provider})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" className="w-full" disabled={createChatMutation.isPending}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Chat
          </Button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 p-2">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={cn(
              "group w-full rounded-lg flex items-center transition-colors px-3 py-2",
              selectedChatId === chat.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            <button
              onClick={() => onSelectChat(chat.id)}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && (
                <div className="truncate">
                  <div className="text-sm font-medium truncate">{chat.title}</div>
                  <div className="text-xs opacity-70 truncate">
                    {models.find(m => m.id === chat.model)?.name || chat.model}
                  </div>
                </div>
              )}
            </button>
            {!isCollapsed && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleRenameClick(chat)}>
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => deleteChatMutation.mutate(chat.id)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>

      {mounted && (
        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Chat</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRename} className="space-y-4">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter new title"
              />
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={renameChatMutation.isPending || !newTitle.trim()}
                >
                  Save
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}