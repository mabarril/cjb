import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../../core/admin/admin.service';
import { Profile } from '../../../core/supabase/supabase.service';

@Component({
  selector: 'app-coristas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coristas.html',
  styleUrl: './coristas.css'
})
export class Coristas implements OnInit {
  private adminService = inject(AdminService);
  private router = inject(Router);

  coristas = signal<Profile[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Filters
  searchTerm = signal('');
  filterNaipe = signal<string>('');
  filterStatus = signal<string>('');

  // Edit Modal
  selectedCorista = signal<Profile | null>(null);
  isEditModalOpen = signal(false);

  // Confirm Delete Modal
  coristaToDelete = signal<Profile | null>(null);
  isDeleteModalOpen = signal(false);

  filteredCoristas = computed(() => {
    return this.coristas().filter(c => {
      const matchName = c.full_name?.toLowerCase().includes(this.searchTerm().toLowerCase()) || false;
      const matchNaipe = this.filterNaipe() ? c.voice_part === this.filterNaipe() : true;
      const matchStatus = this.filterStatus() ? c.status === this.filterStatus() : true;
      return matchName && matchNaipe && matchStatus;
    });
  });

  ngOnInit() {
    this.loadCoristas();
  }

  goBack() {
    this.router.navigate(['/admin']);
  }

  loadCoristas() {
    this.loading.set(true);
    this.adminService.getCoristas().subscribe({
      next: (data: Profile[]) => {
        this.coristas.set(data);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error(err);
        this.error.set('Erro ao carregar coristas.');
        this.loading.set(false);
      }
    });
  }

  openEditModal(corista: Profile) {
    // Clone to avoid changing original before save
    this.selectedCorista.set({ ...corista });
    this.isEditModalOpen.set(true);
  }

  closeEditModal() {
    this.selectedCorista.set(null);
    this.isEditModalOpen.set(false);
  }

  saveCorista() {
    const corista = this.selectedCorista();
    if (!corista) return;

    this.adminService.updateCoristaProfile(corista.id, {
      full_name: corista.full_name,
      role: corista.role,
      voice_part: corista.voice_part,
      status: corista.status,
      rg: corista.rg,
      cpf: corista.cpf,
      orgao_emissor: corista.orgao_emissor,
      endereco: corista.endereco,
      data_nascimento: corista.data_nascimento,
      celular: corista.celular
    }).subscribe({
      next: () => {
        this.loadCoristas(); // Refresh list
        this.closeEditModal();
      },
      error: (err: any) => {
        console.error(err);
        alert('Erro ao salvar corista.');
      }
    });
  }

  exportActiveToExcel() {
    const ativos = this.coristas().filter(c => c.status === 'approved');
    
    if (ativos.length === 0) {
      alert('Não há coristas ativos para exportar.');
      return;
    }

    const headers = [
      'Nome', 'Celular', 'Data Nascimento', 'RG', 'Órgão Emissor', 'CPF', 'Endereço', 'Naipe', 'Status'
    ];

    const rows = ativos.map(c => [
      `"${c.full_name || ''}"`,
      `"${c.celular || ''}"`,
      `"${c.data_nascimento || ''}"`,
      `"${c.rg || ''}"`,
      `"${c.orgao_emissor || ''}"`,
      `"${c.cpf || ''}"`,
      `"${c.endereco || ''}"`,
      `"${c.voice_part || ''}"`,
      `"${c.status || ''}"`
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    // Add BOM for Excel UTF-8 compatibility
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `coristas_ativos_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }

  toggleAdminRole(corista: Profile) {
    const newRole = corista.role === 'admin' ? 'corista' : 'admin';
    const confirmMessage = newRole === 'admin' 
      ? `Tem certeza que deseja conceder privilégios de Administrador para ${corista.full_name}?`
      : `Tem certeza que deseja remover os privilégios de Administrador de ${corista.full_name}?`;

    if (confirm(confirmMessage)) {
      // Optimistic update
      this.coristas.update(list => list.map(c => c.id === corista.id ? { ...c, role: newRole } as Profile : c));
      
      this.adminService.updateCoristaProfile(corista.id, { role: newRole }).subscribe({
        error: (err) => {
          console.error("Erro ao alterar permissão:", err);
          alert('Erro ao alterar permissão do usuário.');
          this.loadCoristas(); // Revert optimistic update
        }
      });
    }
  }

  openDeleteModal(corista: Profile) {
    this.coristaToDelete.set(corista);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.coristaToDelete.set(null);
    this.isDeleteModalOpen.set(false);
  }

  confirmDelete() {
    const corista = this.coristaToDelete();
    if (!corista) return;

    this.adminService.deleteCorista(corista.id).subscribe({
      next: () => {
        this.loadCoristas();
        this.closeDeleteModal();
      },
      error: (err: any) => {
        console.error(err);
        alert('Erro ao inativar corista.');
      }
    });
  }
}
