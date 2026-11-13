import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { Category } from '../domain/model/category.entity';
import { CategoryAssembler } from './category-assembler';
import { CategoryResource, CategoryResponse } from './category-response';

export class CategoryApiEndpoint extends BaseApiEndpoint<
  Category,
  CategoryResource,
  CategoryResponse,
  CategoryAssembler
> {
  constructor(http: HttpClient) {
    super(http, `${environment.apiBaseUrl}/categories`, new CategoryAssembler());
  }

  /** Categories are created and renamed by name only; the backend derives the code and the identifier. */
  override create(entity: Category): Observable<Category> {
    return this.http.post<CategoryResource>(this.endpointUrl, { name: entity.name }).pipe(
      map((created) => this.assembler.toEntityFromResource(created)),
      catchError(this.handleError('Failed to create the category')),
    );
  }

  override update(entity: Category, id: number): Observable<Category> {
    return this.http.put<CategoryResource>(`${this.endpointUrl}/${id}`, { name: entity.name }).pipe(
      map((updated) => this.assembler.toEntityFromResource(updated)),
      catchError(this.handleError('Failed to rename the category')),
    );
  }
}
