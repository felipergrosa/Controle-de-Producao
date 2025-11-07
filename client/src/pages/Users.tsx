import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { UserPlus, UserX, UserCheck, Key, Edit, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Users() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [newDefaultReaderMode, setNewDefaultReaderMode] = useState(false);
  
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"user" | "admin">("user");
  const [editDefaultReaderMode, setEditDefaultReaderMode] = useState(false);
  
  const [resetPassword, setResetPassword] = useState("");

  const utils = trpc.useUtils();

  const { data: users = [], isLoading } = trpc.users.list.useQuery();

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      setShowCreateDialog(false);
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewRole("user");
      setNewDefaultReaderMode(false);
      utils.users.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar usuário");
    },
  });

  const updatePasswordMutation = trpc.users.updatePassword.useMutation({
    onSuccess: () => {
      toast.success("Senha atualizada com sucesso!");
      setShowPasswordDialog(false);
      setResetPassword("");
      setSelectedUserId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar senha");
    },
  });

  const toggleActiveMutation = trpc.users.toggleActive.useMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? "Usuário ativado" : "Usuário desativado");
      utils.users.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar usuário");
    },
  });

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      setShowEditDialog(false);
      setSelectedUser(null);
      utils.users.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar usuário");
    },
  });

  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("Usuário deletado com sucesso!");
      setShowDeleteDialog(false);
      setSelectedUser(null);
      utils.users.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao deletar usuário");
    },
  });

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    await registerMutation.mutateAsync({
      email: newEmail,
      password: newPassword,
      name: newName || undefined,
      role: newRole,
      defaultReaderMode: newDefaultReaderMode,
    });
  };

  const handleResetPassword = async () => {
    if (!selectedUserId || !resetPassword) {
      toast.error("Preencha a nova senha");
      return;
    }

    await updatePasswordMutation.mutateAsync({
      userId: selectedUserId,
      newPassword: resetPassword,
    });
  };

  const handleToggleActive = async (userId: number, currentStatus: boolean) => {
    await toggleActiveMutation.mutateAsync({
      userId,
      isActive: !currentStatus,
    });
  };

  const handleEditUser = async () => {
    if (!selectedUserId) return;

    await updateMutation.mutateAsync({
      userId: selectedUserId,
      name: editName || undefined,
      email: editEmail || undefined,
      role: editRole,
      defaultReaderMode: editDefaultReaderMode,
    });
  };

  const handleDeleteUser = async () => {
    if (!selectedUserId) return;

    await deleteMutation.mutateAsync({
      userId: selectedUserId,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground mt-2">Gerencie contas e permissões do sistema</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>Total: {users.length} usuários</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum usuário cadastrado
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último Login</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: any, index: number) => (
                    <TableRow key={user.id} className={index % 2 === 0 ? "bg-amber-50/50" : "bg-white"}>
                      <TableCell className="font-medium">{user.name || "-"}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {user.role === "admin" ? "Administrador" : "Usuário"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={user.isActive ? "default" : "destructive"}>
                            {user.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                          {user.defaultReaderMode && (
                            <Badge className="bg-red-600 text-white hover:bg-red-700">
                              Modo leitor padrão
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.lastSignedIn
                          ? format(new Date(user.lastSignedIn), "dd/MM/yyyy, HH:mm", { locale: ptBR })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setSelectedUserId(user.id);
                              setEditEmail(user.email);
                              setEditName(user.name || "");
                              setEditRole(user.role);
                              setEditDefaultReaderMode(Boolean(user.defaultReaderMode));
                              setShowEditDialog(true);
                            }}
                            title="Editar Usuário"
                          >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setShowPasswordDialog(true);
                            }}
                            title="Resetar Senha"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(user.id, user.isActive)}
                            disabled={toggleActiveMutation.isPending}
                            title={user.isActive ? "Desativar" : "Ativar"}
                          >
                            {user.isActive ? (
                              <UserX className="h-4 w-4 text-red-600" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setSelectedUserId(user.id);
                              setShowDeleteDialog(true);
                            }}
                            title="Deletar Usuário"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Criar Usuário */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>Preencha os dados do novo usuário</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">Email *</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-name">Nome</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome do usuário"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Senha *</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">Função</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as "user" | "admin")}>
                <SelectTrigger id="new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-input/60 bg-muted/40 px-3 py-2">
              <div>
                <Label htmlFor="new-default-reader" className="text-sm font-medium">
                  Modo leitor ativo por padrão
                </Label>
                <p className="text-xs text-muted-foreground">
                  Ao logar, habilita automaticamente o modo leitor nesta conta.
                </p>
              </div>
              <Switch
                id="new-default-reader"
                checked={newDefaultReaderMode}
                onCheckedChange={setNewDefaultReaderMode}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={registerMutation.isPending}>
              {registerMutation.isPending ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Resetar Senha */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Senha</DialogTitle>
            <DialogDescription>Digite a nova senha para o usuário</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">Nova Senha *</Label>
              <Input
                id="reset-password"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setResetPassword("");
                setSelectedUserId(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleResetPassword} disabled={updatePasswordMutation.isPending}>
              {updatePasswordMutation.isPending ? "Atualizando..." : "Resetar Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Usuário */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Atualize os dados do usuário</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do usuário"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Função</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as "user" | "admin")}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-input/60 bg-muted/40 px-3 py-2">
              <div>
                <Label htmlFor="edit-default-reader" className="text-sm font-medium">
                  Modo leitor ativo por padrão
                </Label>
                <p className="text-xs text-muted-foreground">
                  Controla se o modo leitor inicia habilitado para este usuário.
                </p>
              </div>
              <Switch
                id="edit-default-reader"
                checked={editDefaultReaderMode}
                onCheckedChange={setEditDefaultReaderMode}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setSelectedUser(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditUser} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Deletar Usuário */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deletar Usuário</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita!</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              Tem certeza que deseja deletar o usuário <strong>{selectedUser?.email}</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Todos os dados relacionados serão perdidos.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedUser(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteUser} 
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deletando..." : "Deletar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
