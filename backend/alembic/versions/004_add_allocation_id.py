"""Add allocation_id to holdings

Revision ID: 004_add_allocation_id
Revises: 003_add_allocation_category
Create Date: 2026-03-14

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004_add_allocation_id'
down_revision = '003_add_allocation_category'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('holdings', sa.Column('allocation_id', sa.String(length=36), nullable=True))
    op.create_index(op.f('ix_holdings_allocation_id'), 'holdings', ['allocation_id'], unique=False)
    op.create_foreign_key('holdings_allocation_fk', 'holdings', 'allocations', ['allocation_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('holdings_allocation_fk', 'holdings', type_='foreignkey')
    op.drop_index(op.f('ix_holdings_allocation_id'), table_name='holdings')
    op.drop_column('holdings', 'allocation_id')
