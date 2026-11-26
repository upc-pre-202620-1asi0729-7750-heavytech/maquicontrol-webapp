import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IdentityAccessStore } from '../../../../identity-access-management/application/identity-access-store';
import { RoleName } from '../../../../identity-access-management/domain/model/role-name';
import { ProfilesManagementStore } from '../../../../profiles-management/application/profiles-management-store';
import { FleetManagementStore } from '../../../application/fleet-management-store';
import { Category } from '../../../domain/model/category.entity';
import { MachineryAssembler } from '../../../infrastructure/machinery-assembler';
import { MachineryList } from './machinery-list';

function machinery(
  id: number,
  categoryId: number,
  name: string,
  district: string,
  department: string,
  status = 'AVAILABLE',
) {
  return new MachineryAssembler().toEntityFromResource({
    id,
    categoryId,
    name,
    ownerProfileId: 10,
    description: 'Test equipment',
    brand: 'Test',
    model: 'M1',
    manufactureYear: 2024,
    hourlyRate: { amount: 100, currency: 'PEN' },
    status,
    location: { district, department, province: department, address: 'Test address' },
  });
}

describe('MachineryList catalog filters', () => {
  let fixture: ComponentFixture<MachineryList>;
  let root: HTMLElement;
  const items = signal([
    machinery(101, 1, 'Excavadora Lima', 'Surco', 'Lima'),
    machinery(102, 2, 'Grúa Tarapoto', 'Tarapoto', 'San Martín'),
    machinery(103, 1, 'Excavadora Lamas', 'Lamas', 'San Martín', 'RESERVED'),
    machinery(104, 2, 'Grúa Miraflores', 'Miraflores', 'Lima'),
  ]);
  const initialItems = items();
  const categories = signal([
    new Category({ id: 1, name: 'Excavadoras' }),
    new Category({ id: 2, name: 'Grúas' }),
  ]);
  const loading = signal(false);
  const error = signal<string | null>(null);
  const loadMachinery = vi.fn();

  beforeEach(async () => {
    items.set(initialItems);
    loading.set(false);
    error.set(null);
    loadMachinery.mockClear();
    await TestBed.configureTestingModule({
      imports: [MachineryList],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: FleetManagementStore,
          useValue: {
            machinery: items,
            categories,
            loading,
            error,
            loadMachinery,
            machineryCount: computed(() => items().length),
            availableMachineryCount: computed(
              () => items().filter((item) => item.isAvailable()).length,
            ),
            categoryById: (id: number) => categories().find((category) => category.id === id),
          },
        },
        {
          provide: IdentityAccessStore,
          useValue: { hasRole: (role: RoleName) => role === RoleName.Contractor },
        },
        { provide: ProfilesManagementStore, useValue: { currentProfile: signal(null) } },
      ],
    }).compileComponents();
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      'machinery-list': {
        'filter-results': 'Showing {{ count }} of {{ total }} machines',
        'no-results-title': 'No matching machinery',
        'empty-title': 'No machinery yet',
      },
    });
    translate.use('en');
    fixture = TestBed.createComponent(MachineryList);
    root = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  function selectCategory(value: string) {
    const select = root.querySelector<HTMLSelectElement>('#catalog-category')!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function searchLocation(value: string) {
    const input = root.querySelector<HTMLInputElement>('#catalog-location')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function names() {
    return [...root.querySelectorAll('.machinery-card h2')].map((element) =>
      element.textContent?.trim(),
    );
  }

  function clearButton() {
    return root.querySelector<HTMLButtonElement>('.catalog-filters button')!;
  }

  it('shows the full catalog and disables clearing when no filter is active', () => {
    expect(names()).toHaveLength(4);
    expect(root.querySelector('.filter-results')?.textContent).toContain('Showing 4 of 4 machines');
    expect(clearButton().disabled).toBe(true);
  });

  it('filters by category identifier', () => {
    selectCategory('1');
    expect(names()).toEqual(['Excavadora Lima', 'Excavadora Lamas']);
    expect(root.querySelector('.filter-results')?.textContent).toContain('Showing 2 of 4 machines');
  });

  it('matches a partial district regardless of letter case', () => {
    searchLocation('miRAflo');
    expect(names()).toEqual(['Grúa Miraflores']);
  });

  it('matches a department ignoring accents, case and surrounding whitespace', () => {
    searchLocation('  SAN MARTIN  ');
    expect(names()).toEqual(['Grúa Tarapoto', 'Excavadora Lamas']);
  });

  it('requires both category and location to match without changing availability rules', () => {
    selectCategory('1');
    searchLocation('San Martín');
    expect(names()).toEqual(['Excavadora Lamas']);
    expect(root.querySelector('.rent-action')).toBeNull();
    expect(items()).toHaveLength(4);
  });

  it('keeps the filters and clear action available when nothing matches', () => {
    searchLocation('Cusco');
    expect(names()).toEqual([]);
    expect(root.querySelector('.state-message h2')?.textContent).toContain('No matching machinery');
    expect(root.querySelector('.filter-results')?.textContent).toContain('Showing 0 of 4 machines');
    expect(clearButton().disabled).toBe(false);
  });

  it('clears both controls and restores the full catalog', () => {
    selectCategory('2');
    searchLocation('Tarapoto');
    clearButton().click();
    fixture.detectChanges();
    expect(root.querySelector<HTMLSelectElement>('#catalog-category')?.value).toBe('');
    expect(root.querySelector<HTMLInputElement>('#catalog-location')?.value).toBe('');
    expect(names()).toHaveLength(4);
    expect(clearButton().disabled).toBe(true);
  });

  it('treats whitespace-only searches as an unrestricted location', () => {
    searchLocation('   ');
    expect(names()).toHaveLength(4);
  });

  it('updates the filtered result when the source catalog changes', () => {
    searchLocation('Lima');
    items.set([initialItems[0], initialItems[1]]);
    fixture.detectChanges();
    expect(names()).toEqual(['Excavadora Lima']);
    expect(root.querySelector('.filter-results')?.textContent).toContain('Showing 1 of 2 machines');
  });

  it('preserves the original empty catalog state', () => {
    items.set([]);
    fixture.detectChanges();
    expect(root.querySelector('.state-message h2')?.textContent).toContain('No machinery yet');
    expect(root.querySelector('.catalog-filters')).toBeNull();
  });

  it('preserves loading and retry states without showing a misleading result counter', () => {
    loading.set(true);
    fixture.detectChanges();
    expect(root.querySelector('.spinner')).not.toBeNull();
    expect(root.querySelector('.filter-results')).toBeNull();
    loading.set(false);
    error.set('Connection unavailable');
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('.error-message button')!.click();
    expect(loadMachinery).toHaveBeenCalledOnce();
    expect(root.querySelector('.filter-results')).toBeNull();
  });
});
