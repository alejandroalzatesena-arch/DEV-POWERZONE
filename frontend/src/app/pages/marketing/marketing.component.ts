import { Component, Inject, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  MatDialog,
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatPaginatorModule } from '@angular/material/paginator';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { MarketingService } from '../../core/services/marketing.service';
import { ToastService } from '../../core/services/toast.service';
import { Campaign } from '../../core/models/models';
import {
  formatDateTime,
  campaignType,
  campaignStatus,
  CAMPAIGN_TYPES,
} from '../../shared/utils/labels';

@Component({
  selector: 'app-marketing',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatPaginatorModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  templateUrl: './marketing.component.html',
  styleUrl: './marketing.component.scss',
})
export class MarketingComponent implements OnInit {
  private readonly marketing = inject(MarketingService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  readonly rows = signal<Campaign[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly filter = signal('');

  page = 0;
  limit = 10;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const query: Record<string, string | number> = { page: this.page + 1, limit: this.limit };
    if (this.filter()) query['status'] = this.filter();
    this.marketing.list(query).subscribe({
      next: (r) => {
        this.rows.set(r.items);
        this.total.set(r.meta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  applyFilter(f: string): void {
    this.filter.set(f);
    this.page = 0;
    this.load();
  }

  onPage(e: { pageIndex: number; pageSize: number }): void {
    this.page = e.pageIndex;
    this.limit = e.pageSize;
    this.load();
  }

  openCampaign(c?: Campaign): void {
    const ref = this.dialog.open(CampaignDialog, { data: c, width: '560px' });
    ref.afterClosed().subscribe((res) => {
      if (!res) return;
      if (c) {
        this.marketing.update(c.id, res).subscribe({
          next: () => {
            this.toast.success('Campaña actualizada');
            this.load();
          },
          error: () => undefined,
        });
      } else {
        this.marketing.create(res).subscribe({
          next: () => {
            this.toast.success('Campaña creada');
            this.load();
          },
          error: () => undefined,
        });
      }
    });
  }

  send(c: Campaign): void {
    this.marketing.send(c.id).subscribe({
      next: () => {
        this.toast.success('Campaña enviada');
        this.load();
      },
      error: () => undefined,
    });
  }

  cancel(c: Campaign): void {
    this.marketing.cancel(c.id).subscribe({
      next: () => {
        this.toast.success('Campaña cancelada');
        this.load();
      },
      error: () => undefined,
    });
  }

  remove(c: Campaign): void {
    this.marketing.remove(c.id).subscribe({
      next: () => {
        this.toast.success('Campaña eliminada');
        this.load();
      },
      error: () => undefined,
    });
  }

  statsText(c: Campaign): string {
    if (!c.stats) return '';
    const s = c.stats as Record<string, unknown>;
    const sent = Number(s['sent'] ?? 0);
    const opened = Number(s['opened'] ?? 0);
    const clicked = Number(s['clicked'] ?? 0);
    return sent
      ? `Enviados: ${sent} · Abiertos: ${opened} · Clics: ${clicked}`
      : 'Sin estadísticas aún';
  }

  protected readonly formatDateTime = formatDateTime;
  protected readonly campaignType = campaignType;
  protected readonly campaignStatus = campaignStatus;
}

// ---------------- Dialog: Campaña ----------------
@Component({
  selector: 'pz-campaign-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title style="margin:0;padding:24px 24px 0">
      {{ data?.id ? 'Editar campaña' : 'Nueva campaña' }}
    </h2>
    <mat-dialog-content style="display:grid;gap:10px;padding:16px 24px;min-width:480px">
      <mat-form-field appearance="outline"
        ><mat-label>Nombre</mat-label
        ><input matInput formControlName="name" placeholder="Promo de verano 2026"
      /></mat-form-field>
      <mat-form-field appearance="outline"
        ><mat-label>Tipo</mat-label
        ><mat-select formControlName="type">
          @for (c of CAMPAIGN_TYPES; track c.value) {
            <mat-option [value]="c.value">{{ c.label }}</mat-option>
          }
        </mat-select></mat-form-field
      >
      <mat-form-field appearance="outline"
        ><mat-label>Asunto</mat-label><input matInput formControlName="subject"
      /></mat-form-field>
      <mat-form-field appearance="outline"
        ><mat-label>Contenido</mat-label
        ><textarea matInput formControlName="content" rows="4"></textarea>
      </mat-form-field>
      <mat-form-field appearance="outline"
        ><mat-label>Programar envío (fecha y hora)</mat-label
        ><input matInput type="datetime-local" formControlName="scheduledAt"
      /></mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="padding:8px 24px 20px">
      <button mat-button class="pz-btn-ghost" mat-dialog-close>Cancelar</button>
      <button mat-raised-button class="pz-btn-volt" [disabled]="!form.valid" (click)="save()">
        Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: ``,
})
export class CampaignDialog {
  readonly CAMPAIGN_TYPES = CAMPAIGN_TYPES;
  private readonly dialogRef = inject(MatDialogRef<CampaignDialog>);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    type: ['email', Validators.required],
    subject: [''],
    content: [''],
    scheduledAt: [''],
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data?: Campaign) {
    if (data) {
      this.form.patchValue({
        name: data.name,
        type: data.type,
        subject: data.subject ?? '',
        content: data.content ?? '',
        scheduledAt: data.scheduledAt ? data.scheduledAt.slice(0, 16) : '',
      });
    }
  }

  save(): void {
    const v = this.form.getRawValue();
    this.dialogRef.close({
      name: v.name,
      type: v.type,
      subject: v.subject || undefined,
      content: v.content || undefined,
      scheduledAt: v.scheduledAt ? new Date(v.scheduledAt).toISOString() : undefined,
    });
  }
}
