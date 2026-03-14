"""Add allocations, pools, and other new tables

Revision ID: 002_add_allocations_pools
Revises: 001_initial
Create Date: 2026-03-13

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_add_allocations_pools'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add columns to allocations table (if table exists but columns missing)
    op.add_column('allocations', sa.Column('asset_types', sa.String(length=255), nullable=False, server_default=''))
    op.add_column('allocations', sa.Column('sort_order', sa.Float(), nullable=False, server_default=0))

    # Add pool_id to holdings table if it doesn't exist
    # First check if the column exists by trying to add it (will fail silently if exists)
    try:
        op.add_column('holdings', sa.Column('pool_id', sa.Integer(), nullable=True))
        op.create_index(op.f('ix_holdings_pool_id'), 'holdings', ['pool_id'], unique=False)
        op.create_foreign_key('fk_holdings_pool_id', 'holdings', 'pools', ['pool_id'], ['id'])
    except Exception:
        pass

    # Create allocation_snapshots table
    op.create_table(
        'allocation_snapshots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('breakdown_json', sa.Text(), nullable=False),
        sa.Column('total_value', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_allocation_snapshots_date'), 'allocation_snapshots', ['date'], unique=False)
    op.create_index(op.f('ix_allocation_snapshots_id'), 'allocation_snapshots', ['id'], unique=False)
    op.create_index(op.f('ix_allocation_snapshots_user_id'), 'allocation_snapshots', ['user_id'], unique=False)

    # Create pools table
    op.create_table(
        'pools',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pools_category'), 'pools', ['category'], unique=False)
    op.create_index(op.f('ix_pools_id'), 'pools', ['id'], unique=False)
    op.create_index(op.f('ix_pools_user_id'), 'pools', ['user_id'], unique=False)

    # Create pool_snapshots table
    op.create_table(
        'pool_snapshots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('pools_json', sa.Text(), nullable=False),
        sa.Column('total_value', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pool_snapshots_date'), 'pool_snapshots', ['date'], unique=False)
    op.create_index(op.f('ix_pool_snapshots_id'), 'pool_snapshots', ['id'], unique=False)
    op.create_index(op.f('ix_pool_snapshots_user_id'), 'pool_snapshots', ['user_id'], unique=False)

    # Create mx_members table
    op.create_table(
        'mx_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('mx_member_guid', sa.String(length=255), nullable=False),
        sa.Column('institution_id', sa.Integer(), nullable=True),
        sa.Column('institution_name', sa.String(length=255), nullable=True),
        sa.Column('is_connected', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_synced', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_mx_members_id'), 'mx_members', ['id'], unique=False)
    op.create_index(op.f('ix_mx_members_mx_member_guid'), 'mx_members', ['mx_member_guid'], unique=False)
    op.create_index(op.f('ix_mx_members_user_id'), 'mx_members', ['user_id'], unique=False)

    # Create monarch_sessions table
    op.create_table(
        'monarch_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('session_token', sa.Text(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('last_used', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_monarch_sessions_id'), 'monarch_sessions', ['id'], unique=False)
    op.create_index(op.f('ix_monarch_sessions_user_id'), 'monarch_sessions', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_table('monarch_sessions')
    op.drop_table('mx_members')
    op.drop_table('pool_snapshots')
    op.drop_table('pools')
    op.drop_table('allocation_snapshots')

    # Remove pool_id from holdings
    try:
        op.drop_constraint('fk_holdings_pool_id', 'holdings', type_='foreignkey')
        op.drop_index(op.f('ix_holdings_pool_id'), table_name='holdings')
        op.drop_column('holdings', 'pool_id')
    except Exception:
        pass

    # Remove columns from allocations
    op.drop_column('allocations', 'sort_order')
    op.drop_column('allocations', 'asset_types')