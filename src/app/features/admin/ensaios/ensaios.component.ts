import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PresencaService, Session, SessionFormData } from '../../../core/presenca/presenca.service';

@Component({
    selector: 'app-ensaios',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './ensaios.component.html',
})
export class EnsaiosComponent implements OnInit {
    private presencaService = inject(PresencaService);
    private router = inject(Router);
    private fb = inject(FormBuilder);

    sessions = signal<Session[]>([]);
    isLoading = signal(true);
    isSaving = signal(false);
    showModal = signal(false);
    editingSession = signal<Session | null>(null);
    successMessage = signal('');
    errorMessage = signal('');

    form: FormGroup = this.fb.group({
        title: ['', [Validators.required, Validators.minLength(3)]],
        location: ['', [Validators.required]],
        scheduled_at: ['', [Validators.required]],
        end_at: [''],
    });

    ngOnInit() {
        this.loadSessions();
    }

    loadSessions() {
        this.isLoading.set(true);
        this.presencaService.getAllSessions().subscribe({
            next: (data) => {
                this.sessions.set(data);
                this.isLoading.set(false);
            },
            error: (err) => {
                this.showError('Erro ao carregar ensaios: ' + err.message);
                this.isLoading.set(false);
            }
        });
    }

    openCreate() {
        this.editingSession.set(null);
        this.form.reset();
        this.showModal.set(true);
    }

    openEdit(session: Session) {
        this.editingSession.set(session);
        this.form.patchValue({
            title: session.title,
            location: session.location,
            scheduled_at: this.toDatetimeLocal(session.scheduled_at),
            end_at: session.end_at ? this.toDatetimeLocal(session.end_at) : '',
        });
        this.showModal.set(true);
    }

    closeModal() {
        this.showModal.set(false);
        this.form.reset();
    }

    save() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.isSaving.set(true);
        const raw = this.form.value;
        const data: SessionFormData = {
            title: raw.title,
            location: raw.location,
            scheduled_at: new Date(raw.scheduled_at).toISOString(),
            end_at: raw.end_at ? new Date(raw.end_at).toISOString() : null,
        };

        const editing = this.editingSession();
        const op$ = editing
            ? this.presencaService.updateSession(editing.id, data)
            : this.presencaService.createSession(data);

        op$.subscribe({
            next: () => {
                this.isSaving.set(false);
                this.closeModal();
                this.loadSessions();
                this.showSuccess(editing ? 'Ensaio atualizado!' : 'Ensaio criado!');
            },
            error: (err) => {
                this.isSaving.set(false);
                this.showError('Erro ao salvar: ' + err.message);
            }
        });
    }

    activate(session: Session) {
        this.presencaService.activateSession(session.id).subscribe({
            next: () => {
                this.loadSessions();
                this.showSuccess(`"${session.title}" ativado com sucesso!`);
            },
            error: (err) => this.showError('Erro ao ativar: ' + err.message)
        });
    }

    finalize(session: Session) {
        this.presencaService.finalizeSession(session.id).subscribe({
            next: () => {
                this.loadSessions();
                this.showSuccess(`"${session.title}" finalizado.`);
            },
            error: (err) => this.showError('Erro ao finalizar: ' + err.message)
        });
    }

    downloadQR(session: Session) {
        // Canvas Full HD 16:9
        const W = 1920;
        const H = 1080;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d')!;

        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Decorative circles
        ctx.beginPath();
        ctx.arc(W * 0.1, H * 0.15, 200, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99,102,241,0.12)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(W * 0.92, H * 0.85, 260, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(139,92,246,0.1)';
        ctx.fill();

        // Title — Coral name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 64px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Coral Jovem de Brasília', W / 2, 90);

        // Subtitle — session title
        ctx.font = '400 42px sans-serif';
        ctx.fillStyle = '#a5b4fc';
        ctx.fillText(session.title, W / 2, 150);

        // Date/time
        const dateLabel = new Date(session.scheduled_at).toLocaleString('pt-BR', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        ctx.font = '32px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(dateLabel, W / 2, 208);

        // QR Code in center
        this.drawQROnCanvas(ctx, session.qr_token, W, H).then(() => {
            // Bottom instruction
            ctx.font = '36px sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.textAlign = 'center';
            ctx.fillText('Escaneie o QR Code com o app do coral para registrar sua presença', W / 2, H - 60);

            // Download
            const link = document.createElement('a');
            link.download = `qrcode-${session.title.replace(/\s+/g, '-')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    }

    private async drawQROnCanvas(ctx: CanvasRenderingContext2D, token: string, W: number, H: number): Promise<void> {
        return new Promise(async (resolve) => {
            // Dynamically import qrcode library
            const QRCode = await import('qrcode');
            const qrSize = 480;
            const qrDataUrl = await QRCode.toDataURL(token, {
                width: qrSize,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            });

            const img = new Image();
            img.onload = () => {
                // White card behind QR
                const cardPad = 32;
                const cardX = W / 2 - qrSize / 2 - cardPad;
                const cardY = H / 2 - qrSize / 2 - cardPad;
                const cardW = qrSize + cardPad * 2;
                const cardH = qrSize + cardPad * 2;
                const r = 24;
                ctx.beginPath();
                ctx.moveTo(cardX + r, cardY);
                ctx.lineTo(cardX + cardW - r, cardY);
                ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + r);
                ctx.lineTo(cardX + cardW, cardY + cardH - r);
                ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - r, cardY + cardH);
                ctx.lineTo(cardX + r, cardY + cardH);
                ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - r);
                ctx.lineTo(cardX, cardY + r);
                ctx.quadraticCurveTo(cardX, cardY, cardX + r, cardY);
                ctx.closePath();
                ctx.fillStyle = '#ffffff';
                ctx.fill();

                ctx.drawImage(img, W / 2 - qrSize / 2, H / 2 - qrSize / 2, qrSize, qrSize);
                resolve();
            };
            img.src = qrDataUrl;
        });
    }

    goBack() {
        this.router.navigate(['/admin']);
    }

    statusLabel(status: string): string {
        return { agendado: 'Agendado', ativo: 'Ativo', finalizado: 'Finalizado' }[status] ?? status;
    }

    private toDatetimeLocal(iso: string): string {
        // Converts ISO string to format expected by datetime-local input
        return iso.slice(0, 16);
    }

    private showSuccess(msg: string) {
        this.successMessage.set(msg);
        setTimeout(() => this.successMessage.set(''), 4000);
    }

    private showError(msg: string) {
        this.errorMessage.set(msg);
        setTimeout(() => this.errorMessage.set(''), 5000);
    }

    isInvalid(field: string) {
        const c = this.form.get(field);
        return c?.invalid && c?.touched;
    }
}
