"""Add allocation_category to holdings

Revision ID: 003_add_allocation_category
Revises: 002_add_allocations_pools
Create Date: 2026-03-14

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_add_allocation_category'
down_revision = '002_add_allocations_pools'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('holdings', sa.Column('allocation_category', sa.String(length=50), nullable=True))
    op.create_index(op.f('ix_holdings_allocation_category'), 'holdings', ['allocation_category'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_holdings_allocation_category'), table_name='holdings')
    op.drop_column('holdings', 'allocation_category')
